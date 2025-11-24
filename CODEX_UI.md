# 🎨 Codex Interface - Big3 AI Agent SDK

A modern, VS Code-inspired interface for the Big3 Super-Agent system featuring resizable panels, real-time tool events, and a professional developer experience.

## ✨ Features

### 🎯 **Codex-Inspired Layout**
- **Resizable Panels**: Drag to resize sidebar, main chat, and tool panels
- **VS Code Theme**: Professional dark/light themes with developer-friendly colors
- **Activity Sidebar**: Agent status, navigation, and quick actions
- **Tool Events Panel**: Real-time visualization of agent tool usage

### 🤖 **Smart Agent Interface**
- **Live Status Indicators**: Visual feedback for agent states (thinking, coding, browsing, speaking)
- **Multi-Tab Navigation**: Switch between Chat, Code, and Terminal views
- **Voice Integration**: Seamless voice input with transcription
- **Message History**: Persistent chat with AI SDK integration

### 🛠️ **Developer Experience**
- **Custom Scrollbars**: Thin, VS Code-style scrollbars
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Shortcuts**: Command palette support
- **Real-time Updates**: Live tool execution visualization

## 🚀 Quick Start

### 1. **Start All Services**
```bash
make dev
```
This will automatically:
- ✅ Clean ports 3000, 4000, 6379
- ✅ Start Valkey (Redis-compatible)
- ✅ Start Backend API (http://localhost:4000)
- ✅ Start Frontend (http://localhost:3000)

### 2. **Access the Interface**
Open your browser to: **http://localhost:3000**

### 3. **Start Using**
- Type messages in the input area
- Use voice input with the microphone button
- Watch tool events in the right panel
- Monitor agent status in the sidebar

## 🎛️ Interface Components

### **Sidebar (Left Panel)**
- **Agent Status**: Live status indicator with color coding
- **Navigation**: Chat, Code, Terminal tabs
- **Activity Monitor**: Message count, session info, status
- **Quick Actions**: Start/pause sessions, settings

### **Main Chat Area**
- **Messages**: Clean chat interface with user/assistant distinction
- **Input Area**: Text input with voice integration
- **Voice Controls**: Microphone button for voice input

### **Tool Events Panel (Right)**
- **Real-time Events**: Shows tool calls and results
- **Tool Icons**: Visual indicators for different tool types
- **Execution Details**: Input parameters and output results

## 🎨 Theme System

### **Light Theme**
- Clean, bright interface optimized for daytime use
- Subtle borders and backgrounds
- Professional blue accent colors

### **Dark Theme**
- VS Code-inspired dark theme
- High contrast for better visibility
- Optimized for extended coding sessions

## 🔧 Customization

### **Panel Sizes**
All panels are resizable:
- **Sidebar**: 200px - 400px (default: 250px)
- **Main Chat**: Flexible (default: 700px)
- **Tool Events**: 250px - 500px (default: 300px)

### **Color Scheme**
The interface uses CSS custom properties for easy theming:
```css
:root {
  --primary: oklch(0.47 0.13 220);
  --background: oklch(0.98 0.005 240);
  --sidebar: oklch(0.96 0.006 240);
}
```

## 🛠️ Technical Architecture

### **Frontend Stack**
- **Next.js 16**: React framework with App Router
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **AI SDK**: Chat integration with tool events
- **React Resizable Panels**: Drag-to-resize functionality

### **Key Components**
- **CodexInterface**: Main layout component
- **ToolEvent**: Tool execution visualization
- **Message**: Chat message display
- **VoiceControls**: Audio input handling

### **State Management**
- **AI SDK Chat Hook**: Message and status management
- **Local State**: UI state and panel configurations
- **Real-time Updates**: Live agent status tracking

## 🎯 Agent Status States

| Status | Color | Icon | Description |
|--------|-------|------|-------------|
| **idle** | Gray | Activity | Agent ready, waiting for input |
| **thinking** | Yellow | Bot | Processing user request |
| **coding** | Blue | Code2 | Writing or modifying code |
| **browsing** | Purple | GitBranch | Web automation or research |
| **speaking** | Green | Terminal | Voice processing or generation |

## 🔍 Tool Event Types

### **Supported Tools**
- **Terminal**: Shell commands and scripts
- **Code**: File operations and editing
- **Browser**: Web automation and scraping
- **Database**: Data persistence and queries

### **Event Display**
Each tool event shows:
- **Tool Icon**: Visual category indicator
- **Tool Name**: Specific tool used
- **Status Badge**: Current execution state
- **Input Parameters**: Arguments passed to tool
- **Output Results**: Tool execution results

## 🚀 Development

### **Adding New Tools**
1. Update `getToolIcon()` in `ToolEvent.tsx`
2. Add tool-specific styling if needed
3. Update the tool event display logic

### **Customizing Layout**
1. Modify panel sizes in `CodexInterface.tsx`
2. Update CSS classes in `globals.css`
3. Add new components to the layout

### **Theme Customization**
1. Edit CSS custom properties in `globals.css`
2. Add new color schemes
3. Update component styling

## 📱 Mobile Support

The interface is responsive and works on:
- **Desktop**: Full three-panel layout
- **Tablet**: Collapsible sidebar
- **Mobile**: Stacked panel layout

## 🔧 Troubleshooting

### **Common Issues**
1. **Port conflicts**: Run `make kill-ports`
2. **Redis not starting**: Use Docker fallback
3. **Frontend not loading**: Check Node.js version

### **Debug Mode**
Enable debug logging:
```bash
DEBUG=true make dev
```

### **Performance Tips**
- Close unused browser tabs
- Use dark theme for better performance
- Limit concurrent tool executions

## 🎉 Enjoy!

The Codex Interface provides a professional, developer-friendly environment for interacting with AI agents. Whether you're coding, browsing, or just chatting, the interface adapts to your workflow and provides the tools you need.

**Start building amazing AI-powered applications!** 🚀
