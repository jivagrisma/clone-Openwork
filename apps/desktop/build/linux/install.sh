#!/bin/bash
#
# WaIA Universal Installer for Linux
# This script provides automatic installation for all Linux distributions
#

set -e

PRODUCT_NAME="WaIA"
PRODUCT_NAME_LOWER="waia"
VERSION="1.0.0"

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
    echo "║              $PRODUCT_NAME Installer v$VERSION              ║"
    echo "║                                                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect system
detect_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64) echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) echo "unknown" ;;
    esac
}

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    else
        echo "unknown"
    fi
}

detect_package_manager() {
    if command -v apt-get >/dev/null 2>&1; then
        echo "apt"
    elif command -v dnf >/dev/null 2>&1; then
        echo "dnf"
    elif command -v yum >/dev/null 2>&1; then
        echo "yum"
    elif command -v zypper >/dev/null 2>&1; then
        echo "zypper"
    elif command -v pacman >/dev/null 2>&1; then
        echo "pacman"
    else
        echo "unknown"
    fi
}

# Main installation
main() {
    print_header

    # Check if running with sudo
    if [ "$EUID" -ne 0 ]; then
        print_error "This installer requires root privileges. Please run with sudo."
        exit 1
    fi

    # Detect system
    local arch=$(detect_arch)
    local distro=$(detect_distro)
    local pkg_mgr=$(detect_package_manager)

    print_info "System detected:"
    print_info "  Architecture: $arch"
    print_info "  Distribution: $distro"
    print_info "  Package Manager: $pkg_mgr"

    if [ "$arch" = "unknown" ]; then
        print_error "Unsupported architecture: $(uname -m)"
        exit 1
    fi

    # Find the package file
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local package_file=""

    # Search for package file in the same directory
    for ext in "deb" "rpm" "tar.gz" "AppImage"; do
        if ls "${script_dir}/../release/"*."${ext}" 1> /dev/null 2>&1; then
            package_file=$(ls "${script_dir}/../release/"*."${ext}" | head -1)
            break
        fi
    done

    if [ -z "$package_file" ] || [ ! -f "$package_file" ]; then
        print_error "No package file found. Please build the application first."
        exit 1
    fi

    print_info "Found package: $(basename "$package_file")"

    # Install based on package type
    local package_ext="${package_file##*.}"

    case "$package_ext" in
        deb)
            print_info "Installing DEB package..."
            dpkg -i "$package_file" || apt-get install -f -y
            ;;
        rpm)
            print_info "Installing RPM package..."
            case $pkg_mgr in
                dnf) dnf install -y "$package_file" ;;
                yum) yum localinstall -y "$package_file" ;;
                zypper) zypper install -y "$package_file" ;;
                *) rpm -i "$package_file" ;;
            esac
            ;;
        tar.gz|AppImage)
            print_info "Installing portable package..."
            local install_dir="/opt/${PRODUCT_NAME}"
            local temp_dir="/tmp/${PRODUCT_NAME_LOWER}-install"

            # Extract if tar.gz
            if [ "$package_ext" = "tar.gz" ]; then
                mkdir -p "$temp_dir"
                tar -xzf "$package_file" -C "$temp_dir"
                source_dir="$temp_dir"
            else
                # For AppImage, we'll copy it directly
                source_dir="$(dirname "$package_file")"
            fi

            # Create installation directory
            mkdir -p "$install_dir"

            # Copy files
            if [ "$package_ext" = "tar.gz" ]; then
                cp -r "$source_dir"/* "$install_dir/"

                # Find and make executable the main binary
                find "$install_dir" -type f -name "${PRODUCT_NAME}*" -exec chmod +x {} \; 2>/dev/null || true
                find "$install_dir" -type f -executable -exec chmod +x {} \; 2>/dev/null || true
            else
                # Copy AppImage
                cp "$package_file" "$install_dir/${PRODUCT_NAME}"
                chmod +x "$install_dir/${PRODUCT_NAME}"
            fi

            # Create desktop entry
            cat > "/usr/share/applications/${PRODUCT_NAME_LOWER}.desktop" << EOF
[Desktop Entry]
Name=${PRODUCT_NAME}
Comment=Asistente de escritorio potenciado por IA
Exec=${install_dir}/${PRODUCT_NAME}
Icon=${install_dir}/resources/icon.png
Terminal=false
Type=Application
Categories=Utility;Productivity;Development;
Keywords=AI;Assistant;Productivity;WaIA;
StartupNotify=true
EOF

            chmod 644 "/usr/share/applications/${PRODUCT_NAME_LOWER}.desktop"

            # Create symlink in PATH
            ln -sf "$install_dir/${PRODUCT_NAME}" "/usr/local/bin/${PRODUCT_NAME_LOWER}"

            # Cleanup
            rm -rf "$temp_dir"

            print_success "Portable installation completed!"
            ;;
        *)
            print_error "Unknown package format: $package_ext"
            exit 1
            ;;
    esac

    # Post-installation tasks
    print_info "Running post-installation tasks..."

    # Update desktop database
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database /usr/share/applications 2>/dev/null || true
    fi

    # Update icon cache
    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -t /usr/share/icons/hicolor 2>/dev/null || true
    fi

    print_success "$PRODUCT_NAME has been successfully installed!"
    echo ""
    print_info "You can now:"
    print_info "  • Launch from your applications menu"
    print_info "  • Run '$PRODUCT_NAME_LOWER' from terminal"
    print_info "  • Double-click the desktop shortcut"
    echo ""
    print_success "Installation complete!"
}

# Run main function
main "$@"
