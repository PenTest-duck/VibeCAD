// VibeCAD House Design
// A simple house with cube base and triangular roof
// HackHarvard 2025

// ===== CONFIGURABLE PARAMETERS =====
// House dimensions (in mm)
house_width = 200;           // Width of the house
house_depth = 150;           // Depth of the house
house_height = 100;          // Height of the walls

// Roof parameters
roof_height = 80;            // Height of the triangular roof
roof_overhang = 20;          // Overhang of roof beyond walls

// Door parameters
door_width = 40;             // Width of the door
door_height = 60;            // Height of the door
door_thickness = 5;          // Thickness of the door

// Window parameters
window_width = 30;           // Width of windows
window_height = 25;          // Height of windows
window_thickness = 5;        // Thickness of window frames

// Wall thickness
wall_thickness = 10;         // Thickness of walls

// ===== MODULES =====

// House base (cube with hollow interior)
module house_base() {
    difference() {
        // Outer walls
        cube([house_width, house_depth, house_height], center = false);
        
        // Hollow interior
        translate([wall_thickness, wall_thickness, 0]) {
            cube([house_width - 2*wall_thickness, house_depth - 2*wall_thickness, house_height], center = false);
        }
    }
}

// Triangular roof
module triangular_roof() {
    // Calculate roof dimensions
    roof_width = house_width + 2*roof_overhang;
    roof_depth = house_depth + 2*roof_overhang;
    
    // Create triangular roof using polyhedron
    translate([-roof_overhang, -roof_overhang, house_height]) {
        polyhedron(
            points = [
                // Base points
                [0, 0, 0],
                [roof_width, 0, 0],
                [roof_width, roof_depth, 0],
                [0, roof_depth, 0],
                // Peak point
                [roof_width/2, roof_depth/2, roof_height]
            ],
            faces = [
                // Base
                [0, 1, 2, 3],
                // Front face
                [0, 1, 4],
                // Right face
                [1, 2, 4],
                // Back face
                [2, 3, 4],
                // Left face
                [3, 0, 4]
            ]
        );
    }
}

// Door
module door() {
    translate([house_width/2 - door_width/2, -wall_thickness/2, 0]) {
        cube([door_width, door_thickness, door_height], center = false);
    }
}

// Windows
module windows() {
    // Front window
    translate([house_width/4 - window_width/2, -wall_thickness/2, house_height/2 - window_height/2]) {
        cube([window_width, window_thickness, window_height], center = false);
    }
    
    // Back window
    translate([3*house_width/4 - window_width/2, -wall_thickness/2, house_height/2 - window_height/2]) {
        cube([window_width, window_thickness, window_height], center = false);
    }
    
    // Side window
    translate([house_width - wall_thickness/2, house_depth/2 - window_width/2, house_height/2 - window_height/2]) {
        cube([window_thickness, window_width, window_height], center = false);
    }
}

// Chimney
module chimney() {
    chimney_width = 20;
    chimney_depth = 15;
    chimney_height = 40;
    
    translate([house_width - 40, house_depth - 30, house_height + roof_height - chimney_height]) {
        cube([chimney_width, chimney_depth, chimney_height], center = false);
    }
}

// ===== MAIN ASSEMBLY =====
module house() {
    // Core components
    house_base();
    triangular_roof();
    door();
    windows();
    chimney();
}

// ===== RENDERING =====
// Uncomment the component you want to render

// Full house
house();

// Individual components for testing (uncomment as needed)
// house_base();
// triangular_roof();
// door();
// windows();
// chimney();

// ===== EXPORT SETTINGS =====
// For high-quality STL export, use these settings in OpenSCAD:
// - File > Export > Export as STL
// - Set resolution to 0.1 or lower for smooth curves
// - Enable "Open File" to view the exported STL

// ===== CUSTOMIZATION NOTES =====
// To customize the house:
// 1. Adjust the parameters at the top of the file
// 2. Modify house dimensions for different sizes
// 3. Change roof_height for different roof styles
// 4. Adjust door and window sizes and positions
// 5. Add more windows or doors as needed
// 6. Modify chimney position and size
