// Cozy Cottage House - Single Body, Printable Design
// Units: millimeters
// Origin (0,0,0): ground plane center of house footprint
// Axes: +X = width (left↔right), +Y = length (front (−Y) ↔ back (+Y)), +Z = up

// =============================================================================
// EDITABLE PARAMETERS
// =============================================================================

// Overall dimensions
L = 9000;                    // Overall exterior length (Y)
W = 8000;                    // Overall exterior width (X)
H_wall = 2700;               // Top of wall/eaves height
Wall_thk = 200;              // Wall thickness
Plinth_h = 200;              // Base curb below walls

// Roof parameters
Roof_pitch_deg = 35;         // Slope from eaves to ridge (degrees)
Roof_overhang = 300;         // Eave & gable overhang

// Door parameters
Door_w = 900;                // Door width
Door_h = 2100;               // Door height
Door_sill_h = 0;             // Door sill height (0 for flush)

// Window parameters
Win_w = 1200;                // Window width
Win_h = 1200;                // Window height
Win_sill_h = 900;            // Bottom of window above ground

// Chimney parameters
Chimney_w = 600;             // Chimney width (X)
Chimney_d = 400;             // Chimney depth (Y)
Chimney_offset_from_gable = 1200;  // Distance from rear gable toward ridge
Chimney_side_offset = -1200; // Offset along X (negative = left side)

// Edge treatment parameters
Fascia_thk = 25;             // Fascia thickness
Corner_fillet = 2;           // Corner fillet radius

// =============================================================================
// CALCULATED PARAMETERS
// =============================================================================

// Roof calculations
Rise = 0.5 * W * tan(Roof_pitch_deg);  // Rise from eaves to ridge
H_ridge = H_wall + Rise;               // Ridge height

// Window positions (centers at Y = ±L/4)
Win_y_front = -L/4;          // Front window Y position
Win_y_back = L/4;            // Back window Y position

// Chimney position
Chimney_y = L/2 - Chimney_offset_from_gable;  // Chimney Y position

// =============================================================================
// MAIN HOUSE ASSEMBLY
// =============================================================================

module house() {
    // Create the main house structure
    difference() {
        // Main solid body
        union() {
            // 1. Plinth (base)
            plinth();
            
            // 2. Exterior walls
            walls();
            
            // 3. Roof
            roof();
            
            // 4. Chimney
            chimney();
        }
        
        // 5. Interior cavity (hollow out walls)
        interior_cavity();
        
        // 6. Door opening
        door_opening();
        
        // 7. Window openings
        window_openings();
    }
    
    // 8. Edge treatments
    edge_treatments();
}

// =============================================================================
// COMPONENT MODULES
// =============================================================================

module plinth() {
    // Base plinth rectangle centered at origin
    translate([0, 0, Plinth_h/2])
        cube([W, L, Plinth_h], center=true);
}

module walls() {
    // Exterior wall shell
    translate([0, 0, Plinth_h + H_wall/2])
        cube([W, L, H_wall], center=true);
}

module interior_cavity() {
    // Hollow out the interior, keeping wall thickness
    translate([0, 0, Plinth_h + H_wall/2])
        cube([W - 2*Wall_thk, L - 2*Wall_thk, H_wall + 1], center=true);
}

module roof() {
    // Gable roof with overhang
    // Create the roof as a polyhedron
    roof_points = [
        // Bottom face (eaves)
        [-W/2 - Roof_overhang, -L/2 - Roof_overhang, H_wall],
        [W/2 + Roof_overhang, -L/2 - Roof_overhang, H_wall],
        [W/2 + Roof_overhang, L/2 + Roof_overhang, H_wall],
        [-W/2 - Roof_overhang, L/2 + Roof_overhang, H_wall],
        
        // Ridge points
        [-W/2, -L/2, H_ridge],
        [W/2, -L/2, H_ridge],
        [W/2, L/2, H_ridge],
        [-W/2, L/2, H_ridge]
    ];
    
    roof_faces = [
        // Bottom face
        [0, 1, 2, 3],
        // Front gable
        [0, 4, 5, 1],
        // Back gable
        [2, 6, 7, 3],
        // Left roof plane
        [0, 3, 7, 4],
        // Right roof plane
        [1, 5, 6, 2],
        // Ridge
        [4, 7, 6, 5]
    ];
    
    polyhedron(points=roof_points, faces=roof_faces);
}

module chimney() {
    // Chimney on rear roof half
    // Calculate chimney position on sloped roof
    chimney_x = Chimney_side_offset;
    chimney_y = Chimney_y;
    
    // Chimney height above ridge
    chimney_height = 300;
    
    // Position chimney base on roof surface
    translate([chimney_x, chimney_y, H_wall + (chimney_y + L/2) * Rise / (L/2)])
        cube([Chimney_w, Chimney_d, chimney_height]);
}

module door_opening() {
    // Front door opening
    translate([0, -L/2 - Wall_thk/2, Door_sill_h + Door_h/2])
        cube([Door_w, Wall_thk + 1, Door_h], center=true);
}

module window_openings() {
    // Four windows: two on each long side
    
    // Left side windows
    translate([-W/2 - Wall_thk/2, Win_y_front, Win_sill_h + Win_h/2])
        cube([Wall_thk + 1, Win_w, Win_h], center=true);
    translate([-W/2 - Wall_thk/2, Win_y_back, Win_sill_h + Win_h/2])
        cube([Wall_thk + 1, Win_w, Win_h], center=true);
    
    // Right side windows
    translate([W/2 + Wall_thk/2, Win_y_front, Win_sill_h + Win_h/2])
        cube([Wall_thk + 1, Win_w, Win_h], center=true);
    translate([W/2 + Wall_thk/2, Win_y_back, Win_sill_h + Win_h/2])
        cube([Wall_thk + 1, Win_w, Win_h], center=true);
}

module edge_treatments() {
    // Eave fascia
    eave_fascia();
    
    // Gable fascia
    gable_fascia();
    
    // Corner fillets (if supported)
    corner_fillets();
}

module eave_fascia() {
    // Vertical fascia under roof perimeter
    // Front eave
    translate([0, -L/2 - Roof_overhang/2, H_wall - Fascia_thk/2])
        cube([W + 2*Roof_overhang, Fascia_thk, Fascia_thk], center=true);
    
    // Back eave
    translate([0, L/2 + Roof_overhang/2, H_wall - Fascia_thk/2])
        cube([W + 2*Roof_overhang, Fascia_thk, Fascia_thk], center=true);
    
    // Left eave
    translate([-W/2 - Roof_overhang/2, 0, H_wall - Fascia_thk/2])
        cube([Fascia_thk, L + 2*Roof_overhang, Fascia_thk], center=true);
    
    // Right eave
    translate([W/2 + Roof_overhang/2, 0, H_wall - Fascia_thk/2])
        cube([Fascia_thk, L + 2*Roof_overhang, Fascia_thk], center=true);
}

module gable_fascia() {
    // Fascia along gable edges
    // Front gable
    translate([0, -L/2, H_wall + Rise/2])
        rotate([0, 90, 0])
            cube([Fascia_thk, W, Fascia_thk], center=true);
    
    // Back gable
    translate([0, L/2, H_wall + Rise/2])
        rotate([0, 90, 0])
            cube([Fascia_thk, W, Fascia_thk], center=true);
}

module corner_fillets() {
    // Corner fillets on exposed edges
    // This is a simplified version - full fillet implementation would be more complex
    // For now, we'll add small chamfers at key corners
    
    // Wall corners
    for(x = [-1, 1]) {
        for(y = [-1, 1]) {
            translate([x * (W/2 - Corner_fillet), y * (L/2 - Corner_fillet), Plinth_h + H_wall/2])
                cube([2*Corner_fillet, 2*Corner_fillet, H_wall], center=true);
        }
    }
}

// =============================================================================
// RENDERING
// =============================================================================

// Render the complete house
house();

// Optional: Add coordinate system visualization (comment out for final print)
// %coordinate_system();

module coordinate_system() {
    // Visualize coordinate system
    color("red") translate([0, 0, 0]) cube([100, 10, 10]); // X axis
    color("green") translate([0, 0, 0]) cube([10, 100, 10]); // Y axis  
    color("blue") translate([0, 0, 0]) cube([10, 10, 100]); // Z axis
}
