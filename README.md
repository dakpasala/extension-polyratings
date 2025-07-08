# PolyRatings Enhancer

A Chrome browser extension that seamlessly integrates [PolyRatings.dev](https://polyratings.dev) professor ratings directly into the Cal Poly Schedule Builder interface.

## 🎯 What It Does

This extension automatically displays professor ratings from PolyRatings.dev next to instructor names in the Cal Poly Schedule Builder, making it easy to make informed decisions when selecting courses.

### Key Features

- **Automatic Integration**: Ratings appear directly in the Schedule Builder interface
- **Visual Star Ratings**: Beautiful 4-star rating display with partial star support
- **Clickable Links**: Click any rating to view the full professor profile on PolyRatings.dev
- **Multiple Professors**: Handles courses with multiple instructors
- **Smart Name Matching**: Advanced name matching algorithms to handle different name formats
- **Offline Support**: Caches professor data for offline use
- **Real-time Updates**: Automatically detects and processes new content as you navigate

## 🚀 Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Download the Extension**
   ```bash
   git clone https://github.com/yourusername/ScheduleRatings.git
   cd ScheduleRatings
   ```

2. **Open Chrome Extensions**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `ScheduleRatings` folder containing `manifest.json`

4. **Verify Installation**
   - The extension should appear in your extensions list
   - You should see "PolyRatings Enhancer" with version 0.1.0

### Method 2: Install from Chrome Web Store (Future)

*Coming soon! The extension will be available on the Chrome Web Store for easy installation.*

## 📖 How to Use

1. **Navigate to Schedule Builder**
   - Go to the Cal Poly Schedule Builder: `https://cmsweb.pscs.calpoly.edu/`

2. **Browse Courses**
   - Search for courses as you normally would
   - Look for instructor names in course listings

3. **View Ratings**
   - Professor ratings will automatically appear next to instructor names
   - Ratings show as star displays (e.g., ⭐⭐⭐⭐ 4.0/4)
   - Click any rating to open the professor's full profile on PolyRatings.dev

4. **Handle Missing Professors**
   - If a professor isn't in the database, you'll see an "Add to PolyRatings" badge
   - Click the badge to contribute to PolyRatings.dev

## 🔧 How It Works

### Architecture

The extension consists of three main components:

1. **Background Script** (`background.js`)
   - Manages professor data fetching and caching
   - Handles communication with content scripts
   - Implements smart name matching algorithms

2. **Content Script** (`content.js`)
   - Injects rating UI into the Schedule Builder
   - Monitors DOM changes for dynamic content
   - Handles iframe injection for embedded content

3. **Manifest** (`manifest.json`)
   - Defines extension permissions and structure
   - Configures content script injection rules

### Data Flow

1. **Data Fetching**: Extension fetches professor data from a GitHub repository
2. **Caching**: Data is cached locally for offline use and performance
3. **Name Matching**: Advanced algorithms match professor names across different formats
4. **UI Injection**: Ratings are injected into the Schedule Builder interface
5. **User Interaction**: Clicking ratings opens professor profiles on PolyRatings.dev

### Name Matching Algorithm

The extension uses sophisticated name matching to handle various formats:

- **Exact Match**: Direct string comparison
- **Format Conversion**: "First Last" ↔ "Last, First"
- **Multi-word Names**: Handles complex last names
- **Partial Matching**: Fallback for variations and middle names

## 🛠️ Development

### Project Structure

```
ScheduleRatings/
├── manifest.json      # Extension configuration
├── background.js      # Background service worker
├── content.js         # Content script for UI injection
└── README.md         # This file
```

### Key Technologies

- **Manifest V3**: Modern Chrome extension architecture
- **Service Workers**: Background processing and caching
- **Content Scripts**: DOM manipulation and UI injection
- **MutationObserver**: Real-time DOM change detection
- **Chrome Storage API**: Local data persistence

### Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/ScheduleRatings.git
   cd ScheduleRatings
   ```

2. **Load in Chrome**
   - Follow the installation instructions above
   - Use "Load unpacked" to load the extension

3. **Debug and Test**
   - Open Chrome DevTools to see console logs
   - Use the Extensions page to reload the extension
   - Test on the Cal Poly Schedule Builder

### Making Changes

1. **Edit Files**: Modify `background.js` or `content.js` as needed
2. **Reload Extension**: Go to `chrome://extensions/` and click the reload button
3. **Test Changes**: Navigate to the Schedule Builder to test your changes

## 🔍 Troubleshooting

### Common Issues

**Extension Not Working**
- Ensure the extension is enabled in `chrome://extensions/`
- Check that you're on the correct Cal Poly Schedule Builder URL
- Reload the extension and refresh the page

**Ratings Not Appearing**
- Check the browser console for error messages
- Verify that professor data is being fetched correctly
- Ensure the extension has the necessary permissions

**Performance Issues**
- The extension caches data locally for better performance
- Clear browser cache if experiencing issues
- Check network connectivity for data fetching

### Debug Mode

The extension includes comprehensive logging. To debug:

1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Look for messages starting with emojis (🔍, ✅, ❌, etc.)
4. These logs will help identify issues

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Issues**: Use the GitHub Issues page to report bugs
2. **Suggest Features**: Propose new features or improvements
3. **Submit Pull Requests**: Fork the repository and submit PRs
4. **Improve Documentation**: Help improve this README or add code comments

### Development Guidelines

- Follow existing code style and patterns
- Add comprehensive logging for debugging
- Test thoroughly on the Schedule Builder
- Update documentation for new features

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **PolyRatings.dev**: For providing the professor rating data
- **Cal Poly Community**: For feedback and testing
- **Open Source Community**: For inspiration and tools

## 📞 Support

If you need help or have questions:

- **GitHub Issues**: Report bugs or request features
- **Email**: Contact the maintainers directly
- **Documentation**: Check this README for common solutions

---

**Made with ❤️ for the Cal Poly community** 