// Load environment variables from .env file
require('dotenv').config();

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class ComprehensiveLongBeachScraper {
    constructor() {
        this.baseUrl = 'https://www.longbeachny.gov';
        this.scrapedData = [];
        this.visitedUrls = new Set();
        this.discoveredUrls = new Set();
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        this.maxPages = 500; // Limit to prevent infinite crawling
        this.delay = 2000; // 2 seconds between requests
    }

    async scrapeEverything() {
        console.log('Starting COMPREHENSIVE scrape of Long Beach NY website...');
        console.log(`Target: ${this.baseUrl}`);
        
        // Start with the main page
        this.discoveredUrls.add(this.baseUrl);
        
        // Discover all navigation links first
        await this.discoverAllPages();
        
        // Scrape all discovered pages
        await this.scrapeAllDiscoveredPages();
        
        // Save comprehensive data
        this.saveComprehensiveData();
        
        console.log(`COMPLETE! Scraped ${this.scrapedData.length} pages total`);
        return this.scrapedData;
    }

    async discoverAllPages() {
        console.log('Discovering all pages on the website...');
        
        try {
            const response = await axios.get(this.baseUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            // Extract ALL navigation links
            const navLinks = this.extractAllNavigationLinks($);
            console.log(`Found ${navLinks.length} navigation links`);
            
            // Add comprehensive page discovery
            const allPages = [
                // Main sections
                '/',
                
                // Government section - EVERYTHING
                '/government',
                '/government/boards-commissions',
                '/government/budget-financial-information',
                '/government/city-council-meetings',
                '/government/city-officials',
                '/government/city-officials/city-council',
                '/government/city-officials/city-manager',
                '/government/city-officials/city-court-judges',
                '/government/charter-code-of-ordinances',
                '/government/public-notices',
                '/government/transparency-portal',
                
                // All Departments - COMPREHENSIVE
                '/departments',
                '/departments/animal-control',
                '/departments/beach-maintenance',
                '/departments/beach-park',
                '/departments/building',
                '/departments/city-clerk',
                '/departments/city-comptroller',
                '/departments/city-court',
                '/departments/civil-service',
                '/departments/community-development',
                '/departments/corporation-counsel',
                '/departments/economic-development-planning',
                '/departments/emergency-management',
                '/departments/events',
                '/departments/fire',
                '/departments/ice-arena',
                '/departments/lifeguard-patrol',
                '/departments/municipal-building',
                '/departments/planning-board',
                '/departments/parks-and-recreation',
                '/departments/police-department',
                '/departments/public-relations',
                '/departments/public-works',
                '/departments/public-works/park-avenue-resilient-connectivity-project',
                '/departments/public-works/residential-water-meter-replacement-project',
                '/departments/purchasing',
                '/departments/sanitation-recycling',
                '/departments/sewer-maintenance',
                '/departments/street-maintenance',
                '/departments/tax-assessor',
                '/departments/tax-department',
                '/departments/transportation',
                '/departments/water-pollution-plant',
                '/departments/water-purification-plant',
                '/departments/water-purification-plant/drinking-water-quality-report',
                '/departments/water-sewer-administration',
                '/departments/water-transmission',
                '/departments/zoning-board-of-appeals',
                '/departments/department-listing',
                
                // Community section - EVERYTHING
                '/community',
                '/community/accessibility',
                '/community/beach',
                '/community/building-permits',
                '/community/comprehensive-plan',
                '/community/empire-wind-project',
                '/community/genasys-alert',
                '/community/jobs',
                '/community/licenses-records-ceremonies',
                '/community/online-payments',
                '/community/parks-recreation',
                '/community/preparedness',
                '/community/public-safety',
                '/community/public-safety/police-department',
                '/community/public-safety/fire-department',
                '/community/public-safety/lifeguards',
                '/community/sanitation-recycling',
                '/community/seniors',
                '/community/superblock-engel-burman-project',
                '/community/transportation',
                '/community/school-bus-safety-program',
                
                // Business section - EVERYTHING
                '/business',
                '/business/applying-for-a-mercantile-license',
                '/business/become-an-ocean-friendly-restaurant',
                '/business/business-resources',
                '/business/chamber-of-commerce',
                '/business/co-working-space',
                '/business/commercial-energy-rebates',
                '/business/economic-development-homepage',
                '/business/rfps-vendor-registration',
                '/business/sign-up-for-business-notifications',
                '/business/long-beach-businesses',
                
                // How Do I section - EVERYTHING
                '/how-do-i',
                '/how-do-i/access',
                '/how-do-i/apply-for',
                '/how-do-i/contact',
                '/how-do-i/find-out-about',
                '/how-do-i/pay-for',
                '/how-do-i/sign-up-for',
                '/how-do-i/stay-connected',
                '/how-do-i/faq',
                
                // Explore section - EVERYTHING
                '/explore',
                '/explore/welcome',
                '/explore/about',
                '/explore/history',
                '/explore/eat-play-surf-shop',
                '/explore/places-of-worship',
                '/explore/the-long-beach-chamber-of-commerce',
                '/explore/long-beach-public-library',
                '/explore/long-beach-school-district',
                
                // Quick Connect - EVERYTHING
                '/quick-connect/bus-schedule',
                '/quick-connect/calendar-of-events',
                '/quick-connect/transparency-portal',
                '/quick-connect/recycling',
                '/quick-connect/downloadable-forms',
                
                // Special pages
                '/online-payments',
                '/calendar',
                '/news',
                '/site-map',
                '/accessibility',
                '/contact-us'
            ];
            
            // Add all discovered links
            allPages.forEach(page => {
                this.discoveredUrls.add(this.baseUrl + page);
            });
            
            // Add navigation links
            navLinks.forEach(link => {
                this.discoveredUrls.add(link);
            });
            
            console.log(`Total pages to scrape: ${this.discoveredUrls.size}`);
            
        } catch (error) {
            console.error('Error during page discovery:', error.message);
        }
    }

    extractAllNavigationLinks($) {
        const links = new Set();
        
        // Extract from all navigation areas
        $('nav a, .menu a, .navigation a, header a, footer a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = this.normalizeUrl(href);
                if (this.isValidUrl(fullUrl)) {
                    links.add(fullUrl);
                }
            }
        });
        
        // Extract from main content links
        $('main a, .content a, article a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = this.normalizeUrl(href);
                if (this.isValidUrl(fullUrl)) {
                    links.add(fullUrl);
                }
            }
        });
        
        return Array.from(links);
    }

    normalizeUrl(href) {
        try {
            if (href.startsWith('/')) {
                return this.baseUrl + href;
            } else if (href.startsWith('http')) {
                return href;
            } else {
                return this.baseUrl + '/' + href;
            }
        } catch (error) {
            return null;
        }
    }

    isValidUrl(url) {
        if (!url) return false;
        
        try {
            const urlObj = new URL(url);
            
            // Only scrape longbeachny.gov
            if (!urlObj.hostname.includes('longbeachny.gov')) {
                return false;
            }
            
            // Skip file downloads
            const skipExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.jpg', '.png', '.gif'];
            if (skipExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext))) {
                return false;
            }
            
            // Skip external links
            if (urlObj.pathname.includes('mailto:') || urlObj.pathname.includes('tel:')) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    async scrapeAllDiscoveredPages() {
        console.log('Scraping all discovered pages...');
        
        let pageCount = 0;
        const totalPages = Math.min(this.discoveredUrls.size, this.maxPages);
        
        for (const url of this.discoveredUrls) {
            if (pageCount >= this.maxPages) {
                console.log(`Reached maximum page limit of ${this.maxPages}`);
                break;
            }
            
            if (this.visitedUrls.has(url)) {
                continue;
            }
            
            pageCount++;
            console.log(`[${pageCount}/${totalPages}] Scraping: ${url}`);
            
            await this.scrapePage(url);
            this.visitedUrls.add(url);
            
            // Respectful delay
            await new Promise(resolve => setTimeout(resolve, this.delay));
        }
    }

    async scrapePage(url) {
        try {
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 30000 
            });
            const $ = cheerio.load(response.data);
            
            const pageData = {
                url: url,
                title: $('title').text().trim(),
                type: this.categorizePageType(url),
                scrapedAt: new Date().toISOString(),
                content: {
                    // Page metadata
                    metaDescription: $('meta[name="description"]').attr('content') || '',
                    metaKeywords: $('meta[name="keywords"]').attr('content') || '',
                    
                    // Main content extraction
                    headings: this.extractHeadings($),
                    paragraphs: this.extractParagraphs($),
                    lists: this.extractLists($),
                    tables: this.extractTables($),
                    forms: this.extractForms($),
                    images: this.extractImages($),
                    
                    // Navigation and links
                    navigationLinks: this.extractNavigationLinks($),
                    contentLinks: this.extractContentLinks($),
                    
                    // Contact and administrative info
                    contactInfo: this.extractContactInfo($),
                    addresses: this.extractAddresses($),
                    
                    // Document references
                    documentLinks: this.extractDocumentLinks($),
                    
                    // Full text for searching
                    fullText: this.extractFullText($),
                    
                    // Page statistics
                    wordCount: this.extractFullText($).split(/\s+/).length,
                    linkCount: $('a').length,
                    imageCount: $('img').length
                }
            };
            
            this.scrapedData.push(pageData);
            
        } catch (error) {
            console.error(`Error scraping ${url}:`, error.message);
            
            // Add error placeholder
            this.scrapedData.push({
                url: url,
                error: error.message,
                scrapedAt: new Date().toISOString(),
                content: { fullText: `Error accessing page: ${error.message}` }
            });
        }
    }

    categorizePageType(url) {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('/government/')) return 'government';
        if (urlLower.includes('/departments/')) return 'department';
        if (urlLower.includes('/community/')) return 'community';
        if (urlLower.includes('/business/')) return 'business';
        if (urlLower.includes('/how-do-i/')) return 'how-to';
        if (urlLower.includes('/explore/')) return 'explore';
        if (urlLower.includes('/quick-connect/')) return 'quick-connect';
        return 'general';
    }

    extractHeadings($) {
        const headings = [];
        $('h1, h2, h3, h4, h5, h6').each((index, element) => {
            const text = $(element).text().trim();
            const level = element.tagName.toLowerCase();
            if (text) {
                headings.push({ level, text });
            }
        });
        return headings;
    }

    extractParagraphs($) {
        const paragraphs = [];
        $('p').each((index, element) => {
            const text = $(element).text().trim();
            if (text && text.length > 20) {
                paragraphs.push(text);
            }
        });
        return paragraphs;
    }

    extractLists($) {
        const lists = [];
        $('ul, ol').each((index, element) => {
            const items = [];
            $(element).find('li').each((i, li) => {
                const text = $(li).text().trim();
                if (text) items.push(text);
            });
            if (items.length > 0) {
                lists.push({
                    type: element.tagName.toLowerCase(),
                    items
                });
            }
        });
        return lists;
    }

    extractTables($) {
        const tables = [];
        $('table').each((index, element) => {
            const headers = [];
            const rows = [];
            
            $(element).find('th').each((i, th) => {
                headers.push($(th).text().trim());
            });
            
            $(element).find('tr').each((i, tr) => {
                const cells = [];
                $(tr).find('td').each((j, td) => {
                    cells.push($(td).text().trim());
                });
                if (cells.length > 0) {
                    rows.push(cells);
                }
            });
            
            if (headers.length > 0 || rows.length > 0) {
                tables.push({ headers, rows });
            }
        });
        return tables;
    }

    extractForms($) {
        const forms = [];
        $('form').each((index, element) => {
            const formData = {
                action: $(element).attr('action'),
                method: $(element).attr('method'),
                fields: []
            };
            
            $(element).find('input, select, textarea').each((i, field) => {
                formData.fields.push({
                    name: $(field).attr('name'),
                    type: $(field).attr('type') || field.tagName.toLowerCase(),
                    label: $(field).prev('label').text().trim() || $(field).attr('placeholder'),
                    required: $(field).attr('required') !== undefined
                });
            });
            
            if (formData.fields.length > 0) {
                forms.push(formData);
            }
        });
        return forms;
    }

    extractImages($) {
        const images = [];
        $('img').each((index, element) => {
            const src = $(element).attr('src');
            const alt = $(element).attr('alt');
            if (src) {
                images.push({
                    src: src.startsWith('http') ? src : this.baseUrl + src,
                    alt: alt || ''
                });
            }
        });
        return images;
    }

    extractNavigationLinks($) {
        const links = [];
        $('nav a, .menu a, .navigation a').each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            if (href && text) {
                links.push({
                    url: this.normalizeUrl(href),
                    text
                });
            }
        });
        return links;
    }

    extractContentLinks($) {
        const links = [];
        $('main a, .content a, article a').not('nav a, .menu a').each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            if (href && text) {
                links.push({
                    url: this.normalizeUrl(href),
                    text
                });
            }
        });
        return links;
    }

    extractContactInfo($) {
        const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        
        const text = $.text();
        return {
            phones: [...new Set(text.match(phoneRegex) || [])],
            emails: [...new Set(text.match(emailRegex) || [])]
        };
    }

    extractAddresses($) {
        const addresses = [];
        // Look for typical address patterns
        const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Court|Ct)[^,\n]*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}/g;
        const text = $.text();
        const matches = text.match(addressRegex) || [];
        return [...new Set(matches)];
    }

    extractDocumentLinks($) {
        const docs = [];
        $('a[href]').each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
            
            if (href && docExtensions.some(ext => href.toLowerCase().includes(ext))) {
                docs.push({
                    url: this.normalizeUrl(href),
                    text,
                    type: href.split('.').pop().toLowerCase()
                });
            }
        });
        return docs;
    }

    extractFullText($) {
        // Remove script and style elements
        $('script, style, nav, header, footer').remove();
        
        // Get main content text
        const text = $('body').text()
            .replace(/\s+/g, ' ')
            .trim();
            
        return text;
    }

    saveComprehensiveData() {
        // Save raw scraped data
        const rawFilename = 'longbeach_complete_scrape.json';
        fs.writeFileSync(rawFilename, JSON.stringify(this.scrapedData, null, 2));
        console.log(`💾 Raw data saved to ${rawFilename}`);
        
        // Convert to Newsroom format
        this.convertToNewsroomFormat();
        
        // Generate summary report
        this.generateSummaryReport();
    }

    convertToNewsroomFormat() {
        const convertedData = [];
        
        this.scrapedData.forEach((pageData, index) => {
            if (pageData.error) return; // Skip error pages
            
            let combinedContent = `Title: ${pageData.title}\n\n`;
            
            // Add headings
            if (pageData.content.headings) {
                combinedContent += 'Headings:\n' + pageData.content.headings.map(h => `${h.level.toUpperCase()}: ${h.text}`).join('\n') + '\n\n';
            }
            
            // Add paragraphs
            if (pageData.content.paragraphs) {
                combinedContent += 'Content:\n' + pageData.content.paragraphs.join('\n\n') + '\n\n';
            }
            
            // Add lists
            if (pageData.content.lists) {
                combinedContent += 'Lists:\n' + pageData.content.lists.map(list => 
                    list.items.map(item => `• ${item}`).join('\n')
                ).join('\n\n') + '\n\n';
            }
            
            // Add contact info
            if (pageData.content.contactInfo) {
                const contact = pageData.content.contactInfo;
                if (contact.phones.length > 0) {
                    combinedContent += `Phone Numbers: ${contact.phones.join(', ')}\n`;
                }
                if (contact.emails.length > 0) {
                    combinedContent += `Email Addresses: ${contact.emails.join(', ')}\n`;
                }
            }
            
            // Add full text as fallback
            if (pageData.content.fullText) {
                combinedContent += '\n\nFull Page Text:\n' + pageData.content.fullText;
            }

            convertedData.push({
                filename: `web_${pageData.type}_page_${index + 1}.txt`,
                content: combinedContent,
                date: new Date().toISOString().split('T')[0],
                source: pageData.url,
                type: 'web_scraped',
                category: pageData.type,
                pages: 1,
                wordCount: pageData.content.wordCount || combinedContent.split(/\s+/).length
            });
        });

        // Merge with existing data
        let existingData = [];
        if (fs.existsSync('processing_results.json')) {
            const data = fs.readFileSync('processing_results.json', 'utf8');
            existingData = JSON.parse(data);
        }
        
        const mergedData = [...existingData, ...convertedData];
        fs.writeFileSync('processing_results.json', JSON.stringify(mergedData, null, 2));
        
        console.log(`Converted ${convertedData.length} pages to Newsroom format`);
        console.log(`Total documents available: ${mergedData.length}`);
    }

    generateSummaryReport() {
        const report = {
            totalPages: this.scrapedData.length,
            pagesByType: {},
            totalWords: 0,
            pagesWithErrors: 0,
            scrapingCompleted: new Date().toISOString(),
            coverage: {
                government: 0,
                departments: 0,
                community: 0,
                business: 0,
                other: 0
            }
        };
        
        this.scrapedData.forEach(page => {
            if (page.error) {
                report.pagesWithErrors++;
                return;
            }
            
            const type = page.type || 'unknown';
            report.pagesByType[type] = (report.pagesByType[type] || 0) + 1;
            report.totalWords += page.content.wordCount || 0;
            
            if (report.coverage[type] !== undefined) {
                report.coverage[type]++;
            } else {
                report.coverage.other++;
            }
        });
        
        fs.writeFileSync('scraping_report.json', JSON.stringify(report, null, 2));
        
        console.log('SCRAPING SUMMARY REPORT:');
        console.log(`Total pages scraped: ${report.totalPages}`);
        console.log(`Total words extracted: ${report.totalWords.toLocaleString()}`);
        console.log(`Pages with errors: ${report.pagesWithErrors}`);
        console.log('Pages by category:');
        Object.entries(report.pagesByType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} pages`);
        });
        console.log('Report saved to scraping_report.json');
    }
}

// Integration function for Newsday.js
async function scrapeEverythingForNewsday() {
    const scraper = new ComprehensiveLongBeachScraper();
    
    try {
        console.log('Starting COMPLETE website scrape for Newsday integration...');
        await scraper.scrapeEverything();
        
        console.log('Web scraping completed successfully!');
        console.log('Data has been integrated with Newsday.js system');
        
        return scraper.scrapedData;
        
    } catch (error) {
        console.error('Error during comprehensive scraping:', error.message);
    }
}

// Run the comprehensive scraper if this file is executed directly
if (require.main === module) {
    scrapeEverythingForNewsday();
}

module.exports = { ComprehensiveLongBeachScraper, scrapeEverythingForNewsday };
