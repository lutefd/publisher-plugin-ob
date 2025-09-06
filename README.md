# Obsidian Publisher Plugin

This plugin allows you to publish your Obsidian notes to an external Markdown Publisher API.

## Features

- Publish notes directly from Obsidian to your API
- View all published notes in a dedicated view
- Unpublish notes when needed
- Context menu integration for quick publishing
- Command palette integration

## Installation

1. Download the latest release from the GitHub repository
2. Extract the zip file into your Obsidian plugins folder: `{vault}/.obsidian/plugins/`
3. Enable the plugin in Obsidian settings

## Configuration

1. Go to Settings > Publisher Plugin
2. Enter your API URL (default: http://localhost:8080)
3. Enter your API Key for authentication

## Usage

### Publishing Notes

There are several ways to publish a note:

1. **Command Palette**: Open the command palette (Ctrl/Cmd+P) and search for "Publish Current Note"
2. **Context Menu**: Right-click on a note in the file explorer and select "Publish to API"
3. **Editor Menu**: Right-click in the editor and select "Publish to API"

### Managing Published Notes

1. Click on the paper plane icon in the ribbon to open the Publisher view
2. View all your published notes
3. Click "Expand" to see the full content of a note
4. Click "Unpublish" to remove a note from the API

## Development

### Prerequisites

- Node.js
- npm or yarn

### Setup

1. Clone this repository
2. Run `npm install` or `yarn install`
3. Run `npm run dev` or `yarn dev` to start the development server

### Building

Run `npm run build` or `yarn build` to build the plugin.

## API Requirements

This plugin is designed to work with a Markdown Publisher API that follows this specification:

```yaml
openapi: 3.0.0
info:
  title: Markdown Publisher API
  description: API for publishing and managing markdown notes
  version: 1.0.0
servers:
  - url: http://localhost:8080
    description: Local development server

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

The API should support the following endpoints:
- `POST /publish` - Publish or update a note
- `GET /note/{id}` - Get a specific note
- `DELETE /note/{id}` - Delete a note
- `GET /notes` - List all published notes

## License

MIT
