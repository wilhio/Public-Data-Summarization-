
require('dotenv').config();

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class NewsroomAI {
    constructor() {
        this.processedData = [];
        this.initializeSystem();
    }

    async initializeSystem() {
        console.log('Initializing Newsroom AI System...');
        await this.loadOrProcessDocuments();
        this.startInteractiveMode();
    }

    extractDateFromFilename(filename) {
        const dateMatch = filename.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
        if (dateMatch) {
            return `${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3]}`;
        }
        
        const dateMatch2 = filename.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
        if (dateMatch2) {
            let year = dateMatch2[3];
            if (year.length === 2) year = '20' + year;
            return `${dateMatch2[1].padStart(2, '0')}-${dateMatch2[2].padStart(2, '0')}-${year}`;
        }
        
        if (filename.includes('2024')) return '2024';
        if (filename.includes('2025')) return '2025';
        if (filename.includes('2022')) return '2022';
        
        return 'unknown';
    }

    async loadOrProcessDocuments() {
        try {
            if (fs.existsSync('processing_results.json')) {
                console.log('Loading existing processed documents...');
                const data = fs.readFileSync('processing_results.json', 'utf8');
                this.processedData = JSON.parse(data);
                
                const hasPlaceholders = this.processedData.some(doc => 
                    doc.content && doc.content.includes('Placeholder content')
                );
                
                if (hasPlaceholders) {
                    console.log('Found placeholder content. Processing actual PDFs...');
                    await this.processDocuments();
                } else {
                    console.log(`Loaded ${this.processedData.length} processed documents with real content`);
                }
            } else {
                console.log('Processing city council agenda documents...');
                await this.processDocuments();
            }
        } catch (error) {
            console.error('Error in document processing:', error);
        }
    }

    async processDocuments() {
        const agendaDir = path.join(__dirname, '2025_city_council_agendas');
        
        if (!fs.existsSync(agendaDir)) {
            console.error('2025_city_council_agendas directory not found!');
            return;
        }
        
        const files = fs.readdirSync(agendaDir);
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        
        console.log(`Processing ${pdfFiles.length} PDF files...`);
        this.processedData = [];
        
        for (let i = 0; i < pdfFiles.length; i++) {
            const file = pdfFiles[i];
            console.log(`Processing ${i + 1}/${pdfFiles.length}: ${file}`);
            
            try {
                const filePath = path.join(agendaDir, file);
                const dataBuffer = fs.readFileSync(filePath);
                
                const pdfData = await pdf(dataBuffer);
                
                this.processedData.push({
                    filename: file,
                    content: pdfData.text,
                    date: this.extractDateFromFilename(file),
                    pages: pdfData.numpages,
                    wordCount: pdfData.text.split(/\s+/).length
                });
                
                console.log(`   Extracted ${pdfData.text.length} characters, ${pdfData.numpages} pages`);
                
            } catch (error) {
                console.error(`   Error processing ${file}:`, error.message);
                this.processedData.push({
                    filename: file,
                    content: `Error processing PDF: ${error.message}`,
                    date: this.extractDateFromFilename(file),
                    pages: 0,
                    wordCount: 0
                });
            }
        }
        
        fs.writeFileSync('processing_results.json', JSON.stringify(this.processedData, null, 2));
        console.log(`\nProcessing complete! Processed ${this.processedData.length} documents`);
    }

    async summarizeWithAI(text, query = null) {
        try {
            const prompt = query ? 
                `Based on this city council document, answer the query: "${query}"\n\nDocument content: ${text.substring(0, 4000)}` :
                `Summarize this city council document in 2-3 sentences, focusing on key decisions and actions:\n\n${text.substring(0, 4000)}`;

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 250,
                temperature: 0.7
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('AI processing error:', error.message);
            return 'AI processing unavailable - check your OpenAI API key';
        }
    }

    async queryDocuments(userQuery) {
        console.log(`\nSearching for: "${userQuery}"`);
        
        const stopWords = ['tell', 'me', 'about', 'what', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'when', 'where', 'why', 'who'];
        const keywords = userQuery.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word));
        
        const searchTerms = keywords.length > 0 ? keywords : [userQuery.toLowerCase()];
        
        console.log(`Searching for keywords: ${searchTerms.join(', ')}`);
        
        const results = this.processedData.filter(doc => {
            const content = doc.content.toLowerCase();
            const filename = doc.filename.toLowerCase();
            
            return searchTerms.some(term => 
                content.includes(term) || filename.includes(term)
            );
        });

        if (results.length === 0) {
            return "No documents found matching your query.";
        }

        console.log(`Found ${results.length} relevant documents`);
        
        results.sort((a, b) => {
            const aMatches = searchTerms.reduce((count, term) => {
                return count + (a.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
            }, 0);
            const bMatches = searchTerms.reduce((count, term) => {
                return count + (b.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
            }, 0);
            return bMatches - aMatches;
        });

        const summaries = await Promise.all(
            results.slice(0, 3).map(async (doc, index) => {
                const aiSummary = await this.summarizeWithAI(doc.content, userQuery);
                
                const content = doc.content.toLowerCase();
                let context = '';
                
                for (const term of searchTerms) {
                    const matchIndex = content.indexOf(term);
                    if (matchIndex !== -1) {
                        const start = Math.max(0, matchIndex - 100);
                        const end = Math.min(content.length, matchIndex + 100);
                        context = doc.content.substring(start, end).trim();
                        break;
                    }
                }
                
                return {
                    filename: doc.filename,
                    date: doc.date,
                    pages: doc.pages || 0,
                    wordCount: doc.wordCount || 0,
                    summary: aiSummary,
                    context: context
                };
            })
        );

        return summaries;
    }

    startInteractiveMode() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\n' + '='.repeat(60));
        console.log('NEWSROOM AI - CITY COUNCIL QUERY SYSTEM');
        console.log('='.repeat(60));
        console.log('Commands:');
        console.log('  • Enter any search term to find relevant documents');
        console.log('  • "exit" - Quit the system');
        console.log('='.repeat(60));

        const askQuestion = () => {
            rl.question('\nYour query: ', async (query) => {
                if (query.toLowerCase() === 'exit') {
                    console.log('\nGoodbye! Thanks for using Newsroom AI!');
                    rl.close();
                    return;
                }

                if (query.trim() === '') {
                    console.log('Please enter a search query.');
                    askQuestion();
                    return;
                }

                const results = await this.queryDocuments(query);
                
                if (typeof results === 'string') {
                    console.log(results);
                } else {
                    results.forEach((result, index) => {
                        console.log(`\n${'='.repeat(50)}`);
                        console.log(`RESULT ${index + 1}: ${result.filename}`);
                        console.log(`Date: ${result.date} | Pages: ${result.pages} | Words: ${result.wordCount}`);
                        console.log(`\nAI Summary:`);
                        console.log(result.summary);
                        
                        if (result.context) {
                            console.log(`\nContext:`);
                            console.log(`"...${result.context}..."`);
                        }
                    });
                    console.log(`\n${'='.repeat(50)}`);
                }
                
                askQuestion();
            });
        };

        askQuestion();
    }
}

const newsroomAI = new NewsroomAI();
