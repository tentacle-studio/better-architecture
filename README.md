# HelloWorld C++ Project

A modern C++ project template using CMake and vcpkg for dependency management.

## Features

- 🚀 Modern CMake (3.21+) configuration
- 📦 vcpkg manifest mode for dependency management
- 🎨 {fmt} library for modern string formatting
- ⚙️ CMake presets for easy configuration
- 🔧 Cross-platform support (Windows, macOS, Linux)

## Prerequisites

### 1. Install CMake
```bash
# macOS
brew install cmake

# Ubuntu/Debian
sudo apt install cmake

# Windows
# Download from https://cmake.org/download/
```

### 2. Install vcpkg
```bash
# Clone vcpkg
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg

# Bootstrap vcpkg
./bootstrap-vcpkg.sh  # macOS/Linux
# or
bootstrap-vcpkg.bat   # Windows

# Set environment variable
export VCPKG_ROOT=/path/to/vcpkg
```

### 3. Install Ninja (recommended)
```bash
# macOS
brew install ninja

# Ubuntu/Debian
sudo apt install ninja-build

# Windows
# Download from https://ninja-build.org/
```

## Building the Project

### Option 1: Using CMake Presets (Recommended)

```bash
# Configure with default preset
cmake --preset default

# Or configure for release
cmake --preset release

# Build
cmake --build --preset debug
# or
cmake --build --preset release

# Run the executable
./build/bin/helloworld
```

### Option 2: Traditional CMake

```bash
# Configure
cmake -B build -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake

# Build
cmake --build build

# Run
./build/bin/helloworld
```

### Option 3: Using VS Code

1. Open this folder in VS Code
2. Install the CMake Tools extension
3. Select a kit (compiler) from the status bar
4. Select a configure preset (default, debug, or release)
5. Press F7 to build or use the Build button in the status bar
6. Run using the Launch button

## Project Structure

```
helloworld/
├── CMakeLists.txt           # Main CMake configuration
├── CMakePresets.json        # CMake presets for easy configuration
├── vcpkg.json              # vcpkg manifest with dependencies
├── vcpkg-configuration.json # vcpkg registry configuration
├── src/                    # Source files
│   └── main.cpp           # Main application entry point
├── include/               # Header files (if needed)
├── build/                 # Build output (generated)
└── .vscode/              # VS Code settings
    └── settings.json
```

## Adding Dependencies

To add a new library:

1. Search for available packages:
   ```bash
   $VCPKG_ROOT/vcpkg search <package-name>
   ```

2. Add to `vcpkg.json`:
   ```json
   {
     "dependencies": [
       "fmt",
       "your-new-package"
     ]
   }
   ```

3. Use in CMakeLists.txt:
   ```cmake
   find_package(your-package CONFIG REQUIRED)
   target_link_libraries(helloworld PRIVATE your-package::your-package)
   ```

## Available CMake Presets

- **default** - Debug build with all features
- **debug** - Debug build with debugging symbols
- **release** - Optimized release build

## Troubleshooting

### "Could not find vcpkg"
Make sure `VCPKG_ROOT` environment variable is set:
```bash
export VCPKG_ROOT=/path/to/vcpkg
```

### "Could not find configure preset"
Delete the build directory and reconfigure:
```bash
rm -rf build
cmake --preset default
```

### CMake version too old
Update CMake to version 3.21 or higher.

## License

This project is open source and available under the MIT License.
