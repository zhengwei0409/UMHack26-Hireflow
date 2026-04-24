#!/usr/bin/env python3
import asyncio
import json
import sys
import os

# Redirect stdout/stderr to devnull before importing crawl4ai
sys.stdout = open(os.devnull, 'w')
sys.stderr = open(os.devnull, 'w')

try:
    from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
except ImportError:
    sys.stdout.close()
    sys.stderr.close()
    sys.stdout = os.fdopen(1, 'w')
    print(json.dumps({"success": False, "error": "crawl4ai not installed"}))
    sys.exit(1)

async def crawl(url):
    try:
        crawler = AsyncWebCrawler(verbose=False)
        await crawler.start()
        
        result = await crawler.arun(url=url, config=CrawlerRunConfig())
        await crawler.close()
        
        sys.stdout.close()
        sys.stderr.close()
        sys.stdout = os.fdopen(1, 'w')
        
        if result.success and result.markdown:
            print(json.dumps({"success": True, "content": result.markdown}))
        else:
            print(json.dumps({"success": False, "error": "Failed to fetch"}))
    except Exception as e:
        sys.stdout.close()
        sys.stderr.close()
        sys.stdout = os.fdopen(1, 'w')
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    if url:
        asyncio.run(crawl(url))
    else:
        sys.stdout.close()
        sys.stderr.close()
        sys.stdout = os.fdopen(1, 'w')
        print(json.dumps({"success": False, "error": "No URL provided"}))
