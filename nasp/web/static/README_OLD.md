# Frontend Code Organization Documentation

This document describes the new organized structure for JavaScript, HTML, and CSS code in the NASP (Network Slicing Management Platform) web application.

## Project Structure

```
nasp/web/
├── static/
│   ├── css/                    # Organized CSS files
│   │   ├── base.css           # Base layout styles
│   │   ├── catalog.css        # Catalog-specific styles
│   │   ├── dashboard.css      # Dashboard-specific styles
│   │   └── nsi.css           # NSI-specific styles
│   ├── js/                    # Organized JavaScript files
│   │   ├── base.js           # Base utilities and common functions
│   │   ├── catalog.js        # Catalog functionality
│   │   ├── dashboard.js      # Dashboard functionality
│   │   └── nsi.js           # NSI functionality
│   ├── components/           # Reusable components (future use)
│   ├── assets/              # Bootstrap and other assets
│   ├── style.css           # Main stylesheet (existing)
│   └── scripts.js          # Legacy scripts (being phased out)
└── templates/
    ├── base.html           # Base template with organized includes
    ├── catalog.html        # Clean catalog template
    ├── nsi.html           # Clean NSI template
    ├── dashboard-*.html   # Dashboard templates
    └── components/        # Reusable template components
        └── macros.html    # Jinja2 macros for UI components
```

## Key Improvements

### 1. Separation of Concerns
- **HTML**: Only markup and Jinja2 templating logic
- **CSS**: Organized by page/component in separate files
- **JavaScript**: Modular structure with clear responsibilities

### 2. Modular JavaScript Architecture

#### Base Module (`js/base.js`)
- Common utilities and configuration
- AJAX helper functions
- IMSI validation utilities
- Navigation helpers

#### Catalog Module (`js/catalog.js`)
- Slice deployment functionality
- Search and filtering
- Statistics updates
- Emergency handling

#### Dashboard Module (`js/dashboard.js`)
- Live metrics updates
- Topology management
- Export functionality
- Fullscreen controls

#### NSI Module (`js/nsi.js`)
- Instance management
- Metrics updates
- Instance operations (terminate, restart)

### 3. CSS Organization

#### Base Styles (`css/base.css`)
- Layout fundamentals
- Sidebar styling
- Navigation styles

#### Component-Specific Styles
- `css/catalog.css`: Catalog table, modals, avatar circles
- `css/dashboard.css`: Dashboard cards, topology container, status indicators
- `css/nsi.css`: Instance table, slice indicators, action buttons

### 4. Template Structure

#### Base Template Improvements
- Organized CSS/JS includes with blocks for extensions
- Clean separation of layout from content
- Extensible block system for page-specific resources

#### Page Templates
- Removed inline JavaScript and CSS
- Clean HTML structure
- Proper use of CSS classes and data attributes

## Usage Guidelines

### Adding New CSS Styles
1. Determine if it's a base style or component-specific
2. Add to appropriate CSS file
3. Use CSS custom properties (variables) for consistency
4. Follow existing naming conventions

### Adding New JavaScript Functionality
1. Determine which module it belongs to
2. Add as a method to the appropriate object
3. Export to global scope if needed for backward compatibility
4. Use the Utils module for common operations

### Creating New Templates
1. Extend the base template
2. Use appropriate CSS/JS blocks for page-specific resources
3. Use semantic HTML structure
4. Leverage existing CSS classes

### Best Practices
1. **No inline styles or scripts** in HTML templates
2. **Use CSS classes** instead of inline styles
3. **Modular JavaScript** - keep functions organized by purpose
4. **Consistent naming** - follow existing conventions
5. **Documentation** - comment complex functionality

## Migration Notes

### Backward Compatibility
- Legacy `scripts.js` is still included for gradual migration
- Global function exports maintain existing functionality
- Existing onclick handlers are supplemented with event listeners

### Emergency Features
- Emergency reset functionality preserved and improved
- Keyboard shortcuts (Ctrl+Alt+U) for emergency unfreeze
- Server status checking with better error handling

## Future Improvements

1. **Component Library**: Build reusable UI components
2. **TypeScript**: Add type safety to JavaScript modules
3. **Build Process**: Add minification and bundling
4. **Testing**: Add unit tests for JavaScript modules
5. **Documentation**: Auto-generate API documentation

## Dependencies

- jQuery 3.6.0 (for AJAX and DOM manipulation)
- Bootstrap 5 (for UI components and styling)
- Bootstrap Icons (for iconography)

## Browser Support

- Modern browsers supporting ES6+ features
- Progressive enhancement for older browsers
- Graceful degradation of advanced features
