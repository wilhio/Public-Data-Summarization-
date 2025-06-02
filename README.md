# City Council Agenda AI Query System

An AI-powered system for analyzing and querying city council agenda documents using OpenAI's GPT models.

## Features

- **Automatic PDF Processing**: Extracts text from all PDF files in the `city_council_agendas` directory
- **Intelligent Search**: Search by topics, dates, or specific agenda items
- **AI-Powered Summaries**: Get context-aware summaries for your queries
- **Incremental Processing**: Only processes new files on subsequent runs
- **Document Statistics**: View comprehensive stats about your agenda collection
- **Interactive Query Interface**: Real-time question-and-answer system

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the root directory:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Prepare Your Data

Ensure your city council agenda PDF files are in the `city_council_agendas/` directory. The system will automatically:
- Process all PDF files in this directory
- Extract text content from each document
- Parse agenda dates from filenames (expects MM-DD-YYYY format)
- Save processed data to `processing_results.json` for faster subsequent loads

## Usage

### Start the System

```bash
npm start
# or
node Newsday.js
```

### Query Examples

Once the system starts, you can ask questions like:

- **Topic Search**: "water treatment", "budget", "police department"
- **Date Search**: "01-07-2025", "March 2025"
- **Agenda Items**: "ordinance", "public hearing", "contract"
- **Statistics**: Type "stats" to see document collection statistics

### Sample Queries

```
Your query: water treatment
Your query: 01-07-2025
Your query: budget ordinance
Your query: stats
Your query: exit
```

## System Output

For each query, the system provides:

1. **Search Results**: Number of matching documents found
2. **Document Details**: 
   - Filename
   - Agenda date
   - Word count
   - AI-generated summary relevant to your query

## Data Processing

### Initial Run
- Processes all PDF files in `city_council_agendas/`
- Creates `processing_results.json` with extracted content
- May take several minutes depending on document count and size

### Subsequent Runs
- Loads existing processed data instantly
- Checks for new PDF files and processes only those
- Updates `processing_results.json` with new content

## Document Statistics

The system tracks:
- Total number of documents processed
- Date range of agendas
- Total word count across all documents
- Average words per document

## File Structure

```
├── Newsday.js              # Main application file
├── package.json            # Node.js dependencies
├── .env                    # OpenAI API configuration (create this)
├── README.md               # This file
├── city_council_agendas/   # Directory containing PDF agenda files
├── processing_results.json # Cached processed document data
└── node_modules/           # Installed dependencies
```

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `.env` file exists with valid `OPENAI_API_KEY`
2. **PDF Processing Errors**: Some PDF files may be corrupted or password-protected
3. **Memory Issues**: Large PDF collections may require increased Node.js memory: `node --max-old-space-size=4096 Newsday.js`

### Error Handling

The system includes robust error handling:
- Skips problematic PDF files and continues processing
- Gracefully handles API rate limits
- Provides informative error messages

## Dependencies

- **openai**: OpenAI API client for GPT interactions
- **pdf-parse**: PDF text extraction library
- **dotenv**: Environment variable management

## License

MIT License - See LICENSE file for details 