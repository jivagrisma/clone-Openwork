#!/bin/bash
#
# WaIA Uninstaller for Linux
#

set -e

PRODUCT_NAME="WaIA"
PRODUCT_NAME_LOWER="waia"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                        ║"
    echo "║                  $PRODUCT_NAME Uninstaller                    ║"
    echo "║                                                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

main() {
    print_header

    # Check if running with sudo
    if [ "$EUID" -ne 0 ]; then
        print_error "This uninstaller requires root privileges. Please run with sudo."
        exit 1
    fi

    print_info "Uninstalling $PRODUCT_NAME..."

    # Remove symlink
    if [ -L "/usr/local/bin/${PRODUCT_NAME_LOWER}" ]; then
        rm -f "/usr/local/bin/${PRODUCT_NAME_LOWER}"
        print_success "Removed command-line symlink"
    fi

    # Remove desktop entry
    if [ -f "/usr/share/applications/${PRODUCT_NAME_LOWER}.desktop" ]; then
        rm -f "/usr/share/applications/${PRODUCT_NAME_LOWER}.desktop"
        print_success "Removed desktop entry"
    fi

    # Remove installation directory (optional, commented out for safety)
    # if [ -d "/opt/${PRODUCT_NAME}" ]; then
    #     rm -rf "/opt/${PRODUCT_NAME}"
    #     print_success "Removed installation directory"
    # fi

    # Update desktop database
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database /usr/share/applications 2>/dev/null || true
    fi

    # Update icon cache
    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -t /usr/share/icons/hicolor 2>/dev/null || true
    fi

    print_success "$PRODUCT_NAME has been successfully uninstalled!"
    echo ""
    print_info "Note: User data in ~/.config/Accomplish has been preserved."
    print_info "To remove it manually, run: rm -rf ~/.config/Accomplish"
    echo ""
}

main "$@"
