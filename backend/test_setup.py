"""
Test script to verify the installation of required packages
"""

import sys
import importlib
import importlib.metadata

def check_package(package_name):
    try:
        importlib.import_module(package_name)
        try:
            version = importlib.metadata.version(package_name)
            return f"[INSTALLED] {package_name} ({version})"
        except importlib.metadata.PackageNotFoundError:
            return f"[INSTALLED] {package_name} (version unknown)"
    except ImportError:
        return f"[MISSING] {package_name} (Not installed)"

def main():
    print("Checking installed packages...\n")
    
    # Core packages
    core_packages = ["fastapi", "uvicorn", "pydantic", "requests", "dotenv"]
    print("Core packages:")
    for package in core_packages:
        print(f"  {check_package(package)}")
    
    # Document processing packages
    doc_packages = ["PyPDF2", "pdfplumber", "pdf2image", "pytesseract", 
                   "docx", "odf", "pandas", "openpyxl", "bs4", "html2text", "PIL"]
    print("\nDocument processing packages:")
    for package in doc_packages:
        print(f"  {check_package(package)}")
    
    # AI packages
    ai_packages = ["google.generativeai", "openai", "anthropic", "mistralai"]
    print("\nAI packages:")
    for package in ai_packages:
        try:
            importlib.import_module(package)
            print(f"[INSTALLED] {package}")
        except ImportError:
            print(f"[MISSING] {package} (Not installed)")
    
    # Utility packages
    util_packages = ["aiofiles", "jose", "tenacity"]
    print("\nUtility packages:")
    for package in util_packages:
        print(f"  {check_package(package)}")
    
    print("\nPython version:", sys.version)
    print("\nSetup verification complete!")

if __name__ == "__main__":
    main()
