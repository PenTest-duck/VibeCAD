// VibeCAD Chair Design
// A modern, ergonomic chair with configurable dimensions
// HackHarvard 2025

// ===== CONFIGURABLE PARAMETERS =====
// Chair dimensions (in mm)
seat_width = 400;           // Width of the seat
seat_depth = 400;           // Depth of the seat
seat_height = 450;          // Height from floor to seat
seat_thickness = 20;        // Thickness of seat cushion

backrest_height = 350;      // Height of backrest
backrest_width = 380;       // Width of backrest
backrest_thickness = 15;    // Thickness of backrest
backrest_angle = 15;        // Backrest angle in degrees

leg_thickness = 25;         // Thickness of chair legs
leg_spread = 50;            // How much legs spread out at bottom

armrest_height = 200;       // Height of armrests from seat
armrest_length = 200;       // Length of armrests
armrest_thickness = 20;     // Thickness of armrests

// Design parameters
corner_radius = 10;         // Radius for rounded corners
leg_taper = 0.7;            // Leg taper ratio (1.0 = no taper)

// ===== MODULES =====

// Rounded rectangle module
module rounded_rect(width, height, thickness, radius) {
    linear_extrude(height = thickness) {
        offset(r = radius) {
            square([width - 2*radius, height - 2*radius], center = true);
        }
    }
}

// Tapered leg module
module chair_leg(length, top_width, bottom_width, thickness) {
    hull() {
        // Top of leg
        translate([0, 0, 0])
            cube([top_width, thickness, thickness], center = true);
        // Bottom of leg
        translate([0, 0, -length])
            cube([bottom_width, thickness, thickness], center = true);
    }
}

// Seat module
module seat() {
    // Main seat
    translate([0, 0, seat_height]) {
        rounded_rect(seat_width, seat_depth, seat_thickness, corner_radius);
        
        // Seat cushion texture (optional)
        for (i = [-seat_width/3 : seat_width/6 : seat_width/3]) {
            for (j = [-seat_depth/3 : seat_depth/6 : seat_depth/3]) {
                translate([i, j, seat_thickness/2]) {
                    cylinder(h = 2, r = 3, center = true);
                }
            }
        }
    }
}

// Backrest module
module backrest() {
    translate([0, seat_depth/2 + backrest_thickness/2, seat_height + backrest_height/2]) {
        rotate([backrest_angle, 0, 0]) {
            rounded_rect(backrest_width, backrest_thickness, backrest_height, corner_radius);
            
            // Backrest support bars
            for (i = [-backrest_width/3 : backrest_width/3 : backrest_width/3]) {
                translate([i, 0, 0]) {
                    cube([5, backrest_thickness + 10, backrest_height - 20], center = true);
                }
            }
        }
    }
}

// Leg assembly module
module legs() {
    leg_positions = [
        [seat_width/2 - leg_spread, seat_depth/2 - leg_spread],
        [-seat_width/2 + leg_spread, seat_depth/2 - leg_spread],
        [seat_width/2 - leg_spread, -seat_depth/2 + leg_spread],
        [-seat_width/2 + leg_spread, -seat_depth/2 + leg_spread]
    ];
    
    for (pos = leg_positions) {
        translate([pos[0], pos[1], 0]) {
            // Main leg
            chair_leg(seat_height, leg_thickness, leg_thickness * leg_taper, leg_thickness);
            
            // Cross brace for stability
            translate([0, 0, seat_height/2]) {
                rotate([0, 90, 0]) {
                    cube([leg_thickness/2, leg_thickness, seat_width/3], center = true);
                }
            }
        }
    }
}

// Armrest module
module armrests() {
    armrest_positions = [
        [seat_width/2 + armrest_thickness/2, 0],
        [-seat_width/2 - armrest_thickness/2, 0]
    ];
    
    for (pos = armrest_positions) {
        translate([pos[0], pos[1], seat_height + armrest_height/2]) {
            // Armrest support
            translate([0, 0, -armrest_height/2]) {
                cube([armrest_thickness, leg_thickness, armrest_height], center = true);
            }
            
            // Armrest top
            translate([0, 0, armrest_height/2]) {
                rounded_rect(armrest_thickness, armrest_length, 15, 5);
            }
            
            // Armrest connection to backrest
            translate([0, seat_depth/2, backrest_height/2 - armrest_height/2]) {
                rotate([backrest_angle, 0, 0]) {
                    cube([armrest_thickness, 10, backrest_height/2], center = true);
                }
            }
        }
    }
}

// Footrest module (optional)
module footrest() {
    translate([0, seat_depth/2 + 100, 200]) {
        rounded_rect(seat_width - 100, 200, 15, corner_radius);
    }
}

// ===== MAIN ASSEMBLY =====
module chair() {
    // Core components
    seat();
    backrest();
    legs();
    armrests();
    
    // Optional footrest (uncomment if desired)
    // footrest();
}

// ===== RENDERING =====
// Uncomment the component you want to render

// Full chair
chair();

// Individual components for testing (uncomment as needed)
// seat();
// backrest();
// legs();
// armrests();

// ===== EXPORT SETTINGS =====
// For high-quality STL export, use these settings in OpenSCAD:
// - File > Export > Export as STL
// - Set resolution to 0.1 or lower for smooth curves
// - Enable "Open File" to view the exported STL

// ===== CUSTOMIZATION NOTES =====
// To customize the chair:
// 1. Adjust the parameters at the top of the file
// 2. Modify the leg_taper for different leg styles
// 3. Change corner_radius for more/less rounded corners
// 4. Adjust backrest_angle for different seating positions
// 5. Uncomment footrest() for a footrest version
// 6. Modify the cushion texture pattern in the seat module
