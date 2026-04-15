# Makefile
# Build wrapper for CMake project using CMakePresets.json

.PHONY: all configure build debug release clean run help

# Default target: build debug
all: build

# Configure using CMake preset (default = Debug)
configure:
	cmake --preset=default

# Build using CMake preset (debug)
build:
	cmake --build build

# Build using CMake preset (release)
release:
	cmake --build build release
# Build using CMake preset (debug)
debug:
	cmake --build build debug

# Remove build directory
clean:
	rm -rf build

# Run the executable (debug build)
run: build
	./build/bin/better-architecture

# Reconfigure (clean + configure)
reconfigure: clean configure

# Show help message
help:
	@echo "Available targets:"
	@echo "  all           - Build the project (default: debug preset)"
	@echo "  configure     - Run CMake configuration using the default preset"
	@echo "  build         - Build using the debug preset"
	@echo "  debug         - Build using the debug preset"
	@echo "  release       - Build using the release preset"
	@echo "  clean         - Remove the build directory"
	@echo "  run           - Build and run the debug executable"
	@echo "  reconfigure   - Clean and reconfigure the project"
	@echo "  help          - Show this help message"