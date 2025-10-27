#!/bin/bash

# Raindrop Battle - Quick Migration Script
# This will migrate all questions from local MongoDB to Atlas

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Raindrop Battle - Quick Migration    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "❌ Error: MONGODB_URI not set!"
    echo ""
    echo "Please set your MongoDB Atlas connection string:"
    echo ""
    echo "  export MONGODB_URI=\"mongodb+srv://user:password@cluster.mongodb.net/raindrop-battle\""
    echo ""
    echo "Then run this script again:"
    echo "  ./scripts/quick-migrate.sh"
    echo ""
    exit 1
fi

# Check if URI is Atlas (not localhost)
if [[ "$MONGODB_URI" == *"localhost"* ]]; then
    echo "❌ Error: MONGODB_URI points to localhost!"
    echo ""
    echo "Please use your MongoDB Atlas connection string, not localhost."
    echo ""
    exit 1
fi

echo "✅ MONGODB_URI is set"
echo ""

# Check local MongoDB is running
echo "🔍 Checking local MongoDB..."
if ! node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/raindrop-battle').then(() => { console.log('✅ Local MongoDB is running'); process.exit(0); }).catch(() => { console.log('❌ Local MongoDB not running'); process.exit(1); });" 2>/dev/null; then
    echo ""
    echo "❌ Local MongoDB is not running!"
    echo ""
    echo "Start it with one of these commands:"
    echo "  brew services start mongodb-community@8.0"
    echo "  # or"
    echo "  mongod --dbpath ~/mongodb/data/db"
    echo ""
    exit 1
fi

echo ""

# Run migration
echo "🚀 Starting migration..."
echo ""
node scripts/migrate-to-atlas.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "═══════════════════════════════════════"
    echo "🎉 Migration Successful!"
    echo "═══════════════════════════════════════"
    echo ""
    echo "✅ Next steps:"
    echo "   1. Run: node scripts/setup-production-db.js"
    echo "   2. Deploy backend to Render"
    echo "   3. Deploy frontend to Render"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Check the error message above and:"
    echo "  - Verify your Atlas connection string"
    echo "  - Check Atlas Network Access (0.0.0.0/0)"
    echo "  - Verify database user permissions"
    echo ""
    echo "See docs/MIGRATION_GUIDE.md for help"
    echo ""
    exit 1
fi
