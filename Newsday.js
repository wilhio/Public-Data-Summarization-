require('dotenv').config();

const { OpenAI } = require('openai');
const fs = require('fs');
const { scrapeEverythingForNewsday } = require('./data_scrap.js');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class LongBeachWebAI {
    constructor() {
        this.scrapedData = [];
        this.initializeSystem();
    }

    async initializeSystem() {
        console.log('Initializing Long Beach Web AI System...');
        await this.loadOrScrapeWebData();
        this.startInteractiveMode();
    }

    async loadOrScrapeWebData() {
        try {
            if (fs.existsSync('longbeach_complete_scrape.json')) {
                console.log('Loading existing scraped data...');
                const data = fs.readFileSync('longbeach_complete_scrape.json', 'utf8');
                this.scrapedData = JSON.parse(data);
                
                const isDataRecent = this.checkDataFreshness();
                
                if (!isDataRecent) {
                    console.log('Data is older than 24 hours. Refreshing...');
                    await this.refreshScrapedData();
                } else {
                    console.log(`Loaded ${this.scrapedData.length} web pages`);
                    this.displayContentSummary();
                }
            } else {
                console.log('No existing data found. Scraping Long Beach website...');
                await this.refreshScrapedData();
            }
        } catch (error) {
            console.error('Error loading web data:', error);
        }
    }

    checkDataFreshness() {
        if (this.scrapedData.length === 0) return false;
        
        const latestScrape = this.scrapedData.reduce((latest, page) => {
            const pageDate = new Date(page.scrapedAt);
            return pageDate > latest ? pageDate : latest;
        }, new Date(0));
        
        const hoursSinceLastScrape = (Date.now() - latestScrape.getTime()) / (1000 * 60 * 60);
        return hoursSinceLastScrape < 24;
    }

    async refreshScrapedData() {
        console.log('Refreshing web scraped data...');
        try {
            const scrapedData = await scrapeEverythingForNewsday();
            this.scrapedData = scrapedData || [];
            
            this.displayContentSummary();
            console.log('Web data refreshed successfully!');
        } catch (error) {
            console.error('Error refreshing web data:', error.message);
        }
    }

    displayContentSummary() {
        const summary = {
            total: this.scrapedData.length,
            categories: {},
            totalWords: 0,
            pagesWithErrors: 0
        };

        this.scrapedData.forEach(page => {
            if (page.error) {
                summary.pagesWithErrors++;
                return;
            }
            
            const category = page.type || 'general';
            summary.categories[category] = (summary.categories[category] || 0) + 1;
            summary.totalWords += page.content?.wordCount || 0;
        });

        console.log('\nLONG BEACH WEBSITE CONTENT SUMMARY:');
        console.log(`   Total web pages: ${summary.total}`);
        console.log(`   Total words: ${summary.totalWords.toLocaleString()}`);
        console.log(`   Pages with errors: ${summary.pagesWithErrors}`);
        
        if (Object.keys(summary.categories).length > 0) {
            console.log('\nContent by category:');
            Object.entries(summary.categories).forEach(([category, count]) => {
                console.log(`   ${category}: ${count} pages`);
            });
        }
    }

    async summarizeWithAI(pageData, query = null) {
        try {
            let contentText = '';
            
            if (pageData.content.headings && pageData.content.headings.length > 0) {
                contentText += 'Page Headings: ' + pageData.content.headings.map(h => h.text).join(', ') + '\n\n';
            }
            
            if (pageData.content.paragraphs && pageData.content.paragraphs.length > 0) {
                contentText += 'Content: ' + pageData.content.paragraphs.join(' ') + '\n\n';
            }
            
            if (pageData.content.lists && pageData.content.lists.length > 0) {
                contentText += 'Lists: ' + pageData.content.lists.map(list => 
                    list.items.join(', ')
                ).join('; ') + '\n\n';
            }
            
            if (!contentText.trim() && pageData.content.fullText) {
                contentText = pageData.content.fullText;
            }

            const prompt = query ? 
                `Based on this Long Beach government website page, answer the query: "${query}"\n\nPage Title: ${pageData.title}\nPage URL: ${pageData.url}\nContent: ${contentText.substring(0, 4000)}` :
                `Summarize this Long Beach government website page in 2-3 sentences, focusing on key services and information:\n\nPage Title: ${pageData.title}\nContent: ${contentText.substring(0, 4000)}`;

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

    async queryDocuments(userQuery, filterCategory = 'all') {
        console.log(`\nSearching Long Beach website for: "${userQuery}"`);
        if (filterCategory !== 'all') {
            console.log(`Filter: ${filterCategory} content only`);
        }
        
        const stopWords = ['tell', 'me', 'about', 'what', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'when', 'where', 'why', 'who'];
        const keywords = userQuery.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word));
        
        const searchTerms = keywords.length > 0 ? keywords : [userQuery.toLowerCase()];
        
        console.log(`Searching for keywords: ${searchTerms.join(', ')}`);
        
        let pagesToSearch = this.scrapedData.filter(page => !page.error);
        if (filterCategory !== 'all') {
            pagesToSearch = pagesToSearch.filter(page => page.type === filterCategory);
        }

        const results = pagesToSearch.filter(page => {
            const title = (page.title || '').toLowerCase();
            const url = (page.url || '').toLowerCase();
            
            let contentText = '';
            if (page.content) {
                if (page.content.headings) {
                    contentText += page.content.headings.map(h => h.text).join(' ') + ' ';
                }
                if (page.content.paragraphs) {
                    contentText += page.content.paragraphs.join(' ') + ' ';
                }
                if (page.content.lists) {
                    contentText += page.content.lists.map(list => list.items.join(' ')).join(' ') + ' ';
                }
                if (page.content.fullText) {
                    contentText += page.content.fullText;
                }
            }
            contentText = contentText.toLowerCase();
            
            return searchTerms.some(term => 
                title.includes(term) || 
                url.includes(term) || 
                contentText.includes(term)
            );
        });

        if (results.length === 0) {
            return `No content found matching "${userQuery}"${filterCategory !== 'all' ? ` in ${filterCategory} section` : ''}.`;
        }

        console.log(`Found ${results.length} relevant pages`);
        
        results.sort((a, b) => {
            const getMatchCount = (page) => {
                let text = `${page.title || ''} ${page.url || ''}`;
                if (page.content) {
                    if (page.content.headings) text += ' ' + page.content.headings.map(h => h.text).join(' ');
                    if (page.content.paragraphs) text += ' ' + page.content.paragraphs.join(' ');
                    if (page.content.fullText) text += ' ' + page.content.fullText;
                }
                text = text.toLowerCase();
                
                return searchTerms.reduce((count, term) => {
                    return count + (text.match(new RegExp(term, 'g')) || []).length;
                }, 0);
            };
            
            return getMatchCount(b) - getMatchCount(a);
        });

        const summaries = await Promise.all(
            results.slice(0, 3).map(async (page, index) => {
                const aiSummary = await this.summarizeWithAI(page, userQuery);
                
                let context = '';
                let searchText = '';
                
                if (page.content) {
                    if (page.content.paragraphs && page.content.paragraphs.length > 0) {
                        searchText = page.content.paragraphs.join(' ');
                    } else if (page.content.fullText) {
                        searchText = page.content.fullText;
                    }
                }
                
                if (searchText) {
                    const searchTextLower = searchText.toLowerCase();
                    for (const term of searchTerms) {
                        const matchIndex = searchTextLower.indexOf(term);
                        if (matchIndex !== -1) {
                            const start = Math.max(0, matchIndex - 100);
                            const end = Math.min(searchText.length, matchIndex + 100);
                            context = searchText.substring(start, end).trim();
                            break;
                        }
                    }
                }
                
                return {
                    title: page.title || 'Long Beach Website Page',
                    url: page.url,
                    category: page.type,
                    wordCount: page.content?.wordCount || 0,
                    summary: aiSummary,
                    context: context,
                    contactInfo: page.content?.contactInfo || null,
                    lastUpdated: page.scrapedAt
                };
            })
        );

        return summaries;
    }

    displayResults(results) {
        results.forEach((result, index) => {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`RESULT ${index + 1}: ${result.title}`);
            console.log(`Category: ${result.category || 'general'} | Words: ${result.wordCount}`);
            console.log(`URL: ${result.url}`);
            
            console.log(`\nAI Summary:`);
            console.log(result.summary);
            
            if (result.context) {
                console.log(`\nContext:`);
                console.log(`"...${result.context}..."`);
            }
            
            if (result.contactInfo && (result.contactInfo.phones.length > 0 || result.contactInfo.emails.length > 0)) {
                console.log(`\nContact Information:`);
                if (result.contactInfo.phones.length > 0) {
                    console.log(`   Phone: ${result.contactInfo.phones.join(', ')}`);
                }
                if (result.contactInfo.emails.length > 0) {
                    console.log(`   Email: ${result.contactInfo.emails.join(', ')}`);
                }
            }
        });
        console.log(`\n${'='.repeat(70)}`);
    }

    startInteractiveMode() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\n' + '='.repeat(70));
        console.log('LONG BEACH WEB AI - GOVERNMENT INFORMATION SYSTEM');
        console.log('='.repeat(70));
        console.log('Available Commands:');
        console.log('  [search term] - Search all website content');
        console.log('  gov [search term] - Search government pages');
        console.log('  dept [search term] - Search department pages');
        console.log('  community [search term] - Search community content');
        console.log('  business [search term] - Search business information');
        console.log('  help [search term] - Search how-to guides');
        console.log('  explore [search term] - Search explore section');
        console.log('  quick [search term] - Search quick connect');
        console.log('  refresh - Update scraped website data');
        console.log('  status - Show content summary');
        console.log('  exit - Quit the system');
        console.log('='.repeat(70));

        const askQuestion = () => {
            rl.question('\nYour query: ', async (input) => {
                const parts = input.trim().split(' ');
                const command = parts[0].toLowerCase();
                const query = parts.slice(1).join(' ');

                if (command === 'exit') {
                    console.log('\nGoodbye! Thanks for using Long Beach Web AI!');
                    rl.close();
                    return;
                }

                if (command === 'refresh') {
                    await this.refreshScrapedData();
                    askQuestion();
                    return;
                }

                if (command === 'status') {
                    this.displayContentSummary();
                    askQuestion();
                    return;
                }

                let filterCategory = 'all';
                let searchQuery = input.trim();

                const categoryMap = {
                    'gov': 'government',
                    'dept': 'department',
                    'community': 'community',
                    'business': 'business',
                    'help': 'how-to',
                    'explore': 'explore',
                    'quick': 'quick-connect'
                };

                if (categoryMap[command]) {
                    if (!query) {
                        console.log('Please provide a search term after the category.');
                        askQuestion();
                        return;
                    }
                    
                    filterCategory = categoryMap[command];
                    searchQuery = query;
                }

                if (!searchQuery) {
                    console.log('Please enter a search query.');
                    askQuestion();
                    return;
                }

                const results = await this.queryDocuments(searchQuery, filterCategory);
                
                if (typeof results === 'string') {
                    console.log(results);
                } else {
                    this.displayResults(results);
                }
                
                askQuestion();
            });
        };

        askQuestion();
    }
}

const longBeachWebAI = new LongBeachWebAI();
