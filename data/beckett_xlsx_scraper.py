"""
Beckett Bowman Baseball XLSX Checklist Scraper
==============================================

Downloads XLSX checklist files from Beckett.com for:
- Bowman Baseball
- Bowman Chrome Baseball  
- Bowman Draft Baseball

Years: 2020-2025

Usage:
    python beckett_xlsx_scraper.py

Output directory: C:\\Users\\Brian\\Desktop\\IDGAS\\data
"""

import os
import re
import sys
import time
import logging
from pathlib import Path
from typing import Optional, List, Tuple
from dataclasses import dataclass
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4"])
    import requests
    from bs4 import BeautifulSoup

# =============================================================================
# CONFIGURATION
# =============================================================================

# Output directory for downloaded files
OUTPUT_DIR = Path(r"C:\Users\Brian\Desktop\IDGAS\data")

# Product configurations
PRODUCTS = {
    "bowman-baseball": {
        "url_template": "https://www.beckett.com/news/{year}-bowman-baseball-cards/",
        "years": range(2020, 2026),
    },
    "bowman-chrome": {
        "url_template": "https://www.beckett.com/news/{year}-bowman-chrome-baseball-cards/",
        "years": range(2020, 2026),
    },
    "bowman-draft": {
        "url_template": "https://www.beckett.com/news/{year}-bowman-draft-baseball-cards/",
        "years": range(2020, 2026),
    },
}

# Request configuration
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

REQUEST_TIMEOUT = 30
DELAY_BETWEEN_REQUESTS = 1.5  # seconds

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class DownloadResult:
    product: str
    year: int
    success: bool
    message: str
    filename: Optional[str] = None
    xlsx_url: Optional[str] = None


# =============================================================================
# SCRAPER FUNCTIONS
# =============================================================================

def create_session() -> requests.Session:
    """Create and configure a requests session."""
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def fetch_page(url: str, session: requests.Session) -> Optional[str]:
    """
    Fetch page HTML content.
    
    Args:
        url: URL to fetch
        session: Requests session
        
    Returns:
        HTML content or None if fetch failed
    """
    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.text
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching {url}")
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error fetching {url}: {e}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error fetching {url}: {e}")
    return None


def extract_xlsx_urls(html_content: str) -> List[str]:
    """
    Extract all XLSX download URLs from the page HTML.
    
    Args:
        html_content: HTML content of the page
        
    Returns:
        List of XLSX URLs found
    """
    xlsx_urls = []
    
    # Method 1: Use BeautifulSoup to find links
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find all links with .xlsx extension
    for link in soup.find_all('a', href=True):
        href = link['href']
        if '.xlsx' in href.lower():
            xlsx_urls.append(href)
    
    # Method 2: Regex fallback for S3 URLs
    s3_patterns = [
        r'href=["\']?(https://beckett-www\.s3\.amazonaws\.com/[^"\'>\s]+\.xlsx)["\']?',
        r'(https://beckett-www\.s3\.amazonaws\.com/news/news-content/uploads/[^"\'>\s]+\.xlsx)',
    ]
    
    for pattern in s3_patterns:
        matches = re.findall(pattern, html_content, re.IGNORECASE)
        for match in matches:
            if match not in xlsx_urls:
                xlsx_urls.append(match)
    
    return xlsx_urls


def get_best_xlsx_url(xlsx_urls: List[str], product: str, year: int) -> Optional[str]:
    """
    Select the best matching XLSX URL for a specific product and year.
    
    Args:
        xlsx_urls: List of found XLSX URLs
        product: Product name (e.g., 'bowman-baseball')
        year: Year
        
    Returns:
        Best matching URL or None
    """
    if not xlsx_urls:
        return None
    
    # If only one URL, return it
    if len(xlsx_urls) == 1:
        return xlsx_urls[0]
    
    # Try to find the most relevant one
    year_str = str(year)
    
    # Priority 1: URL contains both year and product-related keywords
    product_keywords = product.replace('-', ' ').split()
    for url in xlsx_urls:
        url_lower = url.lower()
        if year_str in url and all(kw in url_lower for kw in product_keywords):
            return url
    
    # Priority 2: URL contains year and "checklist"
    for url in xlsx_urls:
        url_lower = url.lower()
        if year_str in url and 'checklist' in url_lower:
            return url
    
    # Priority 3: URL contains year
    for url in xlsx_urls:
        if year_str in url:
            return url
    
    # Fallback: return first URL
    return xlsx_urls[0]


def download_file(url: str, output_path: Path, session: requests.Session) -> bool:
    """
    Download a file from URL to the specified path.
    
    Args:
        url: URL to download
        output_path: Path to save the file
        session: Requests session
        
    Returns:
        True if download succeeded, False otherwise
    """
    try:
        response = session.get(url, timeout=60, stream=True)
        response.raise_for_status()
        
        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file in chunks
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        # Verify file was written
        if output_path.exists() and output_path.stat().st_size > 0:
            return True
        else:
            logger.error(f"File was not written properly: {output_path}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Download failed for {url}: {e}")
        return False
    except IOError as e:
        logger.error(f"IO error saving {output_path}: {e}")
        return False


def process_product_year(
    product: str,
    year: int,
    url_template: str,
    output_dir: Path,
    session: requests.Session
) -> DownloadResult:
    """
    Process a single product/year combination.
    
    Args:
        product: Product name
        year: Year
        url_template: URL template for the product
        output_dir: Output directory
        session: Requests session
        
    Returns:
        DownloadResult with status information
    """
    page_url = url_template.format(year=year)
    logger.info(f"Processing {year} {product}: {page_url}")
    
    # Fetch the page
    html_content = fetch_page(page_url, session)
    if not html_content:
        return DownloadResult(
            product=product,
            year=year,
            success=False,
            message="Failed to fetch page"
        )
    
    # Extract XLSX URLs
    xlsx_urls = extract_xlsx_urls(html_content)
    if not xlsx_urls:
        return DownloadResult(
            product=product,
            year=year,
            success=False,
            message="No XLSX link found on page"
        )
    
    # Get the best matching URL
    xlsx_url = get_best_xlsx_url(xlsx_urls, product, year)
    if not xlsx_url:
        return DownloadResult(
            product=product,
            year=year,
            success=False,
            message="Could not determine best XLSX URL"
        )
    
    logger.info(f"  Found XLSX: {xlsx_url.split('/')[-1]}")
    
    # Generate output filename
    # Use original filename from URL or generate one
    original_filename = xlsx_url.split('/')[-1]
    if original_filename.lower().endswith('.xlsx'):
        filename = f"{year}-{product}-{original_filename}"
    else:
        filename = f"{year}-{product}-checklist.xlsx"
    
    # Clean up filename
    filename = re.sub(r'[<>:"/\\|?*]', '-', filename)
    output_path = output_dir / filename
    
    # Download the file
    if download_file(xlsx_url, output_path, session):
        file_size = output_path.stat().st_size
        logger.info(f"  ✓ Downloaded: {filename} ({file_size:,} bytes)")
        return DownloadResult(
            product=product,
            year=year,
            success=True,
            message="Downloaded successfully",
            filename=filename,
            xlsx_url=xlsx_url
        )
    else:
        return DownloadResult(
            product=product,
            year=year,
            success=False,
            message="Download failed",
            xlsx_url=xlsx_url
        )


def run_scraper(output_dir: Path) -> Tuple[List[DownloadResult], List[DownloadResult]]:
    """
    Main scraper function.
    
    Args:
        output_dir: Directory to save downloaded files
        
    Returns:
        Tuple of (successful_results, failed_results)
    """
    print("=" * 70)
    print("  BECKETT BOWMAN XLSX CHECKLIST SCRAPER")
    print("=" * 70)
    print(f"\n  Output directory: {output_dir}")
    print(f"  Products: {', '.join(PRODUCTS.keys())}")
    print(f"  Years: 2020-2025")
    print("\n" + "-" * 70)
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create session
    session = create_session()
    
    successful = []
    failed = []
    
    total_items = sum(len(config['years']) for config in PRODUCTS.values())
    current_item = 0
    
    for product, config in PRODUCTS.items():
        print(f"\n📦 {product.upper().replace('-', ' ')}")
        print("-" * 50)
        
        for year in config['years']:
            current_item += 1
            print(f"\n  [{current_item}/{total_items}] {year}", end=" ")
            
            result = process_product_year(
                product=product,
                year=year,
                url_template=config['url_template'],
                output_dir=output_dir,
                session=session
            )
            
            if result.success:
                successful.append(result)
                print(f"✓")
            else:
                failed.append(result)
                print(f"✗ ({result.message})")
            
            # Be polite to the server
            time.sleep(DELAY_BETWEEN_REQUESTS)
    
    return successful, failed


def print_summary(successful: List[DownloadResult], failed: List[DownloadResult]):
    """Print a summary of the scraping results."""
    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    
    print(f"\n  ✓ Successfully downloaded: {len(successful)}")
    if successful:
        for result in successful:
            print(f"    • {result.year} {result.product}: {result.filename}")
    
    if failed:
        print(f"\n  ✗ Failed: {len(failed)}")
        for result in failed:
            print(f"    • {result.year} {result.product}: {result.message}")
    
    print("\n" + "=" * 70)


def main():
    """Main entry point."""
    print("\n")
    
    # Check if output directory is accessible
    try:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"ERROR: Cannot create output directory: {OUTPUT_DIR}")
        print(f"       {e}")
        print("\n       Please update the OUTPUT_DIR variable in the script.")
        sys.exit(1)
    
    # Run the scraper
    try:
        successful, failed = run_scraper(OUTPUT_DIR)
        print_summary(successful, failed)
        
        if successful:
            print(f"\n  Files saved to: {OUTPUT_DIR}")
            print("\n  Opening output folder...")
            os.startfile(OUTPUT_DIR)
        
    except KeyboardInterrupt:
        print("\n\n  Scraping cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n  ERROR: {e}")
        logger.exception("Unexpected error")
        sys.exit(1)


if __name__ == "__main__":
    main()