#!/bin/bash

# Valorwell Clinician Portal Verification Script
# This script runs the complete verification process for all fixes

# Display banner
echo "=================================================="
echo "  Valorwell Clinician Portal Verification Process"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js to continue."
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Make the verification script executable
chmod +x src/tests/verify-fixes.js

# Run the verification script
echo "🧪 Running verification tests..."
node src/tests/verify-fixes.js

# Check if verification was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Verification completed successfully!"
    echo ""
    echo "📄 Reports available at:"
    echo "   - Rehabilitation Report: src/REHABILITATION_REPORT.md"
    echo "   - Verification Report: src/VERIFICATION_REPORT.md"
    echo "   - Verification Guide: src/VERIFICATION_README.md"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review the reports"
    echo "   2. Deploy the verified fixes to production"
    echo "   3. Monitor application performance and stability"
    echo ""
else
    echo ""
    echo "❌ Verification failed. Please check the error messages above."
    echo ""
    echo "📄 Partial reports may be available at:"
    echo "   - Rehabilitation Report: src/REHABILITATION_REPORT.md"
    echo "   - Verification Guide: src/VERIFICATION_README.md"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Fix the issues identified in the verification process"
    echo "   2. Run the verification again"
    echo ""
fi

# End of script