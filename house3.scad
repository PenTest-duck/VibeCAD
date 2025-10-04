// house3.scad - Simple house with hip (pyramidal) roof
// Units: millimeters
// Axes: X = left↔right, Y = front↔back (front at Y=0), Z = up
// Origin: lower-front-left corner of the main footprint

// Parameters
W = 6000;              // overall width (X)
D = 4500;              // overall depth (Y)
H_wall = 3000;         // wall height to eaves
t_wall = 150;          // wall thickness for shell
roof_overhang = 250;   // uniform overhang on all sides
H_roof = 2200;         // apex height above eaves
door_w = 900;          // door width
door_h = 2000;         // door height
win_w = 900;           // window width
win_h = 900;           // window height
mullion = 60;          // mullion thickness
sill_h = 1000;         // window sill height above ground
reveal = 50;           // door/window inset depth

module house() {
    difference() {
        // Main house body with hip roof
        union() {
            // Wall shell - rectangular prism footprint shelled inward
            difference() {
                cube([W, D, H_wall]);
                translate([t_wall, t_wall, 0])
                    cube([W - 2*t_wall, D - 2*t_wall, H_wall]);
            }
            
            // Hip roof - pyramidal roof with overhang
            // Create the base rectangle with overhang
            base_points = [
                [-roof_overhang, -roof_overhang, H_wall],
                [W + roof_overhang, -roof_overhang, H_wall],
                [W + roof_overhang, D + roof_overhang, H_wall],
                [-roof_overhang, D + roof_overhang, H_wall]
            ];
            
            // Apex point at center
            apex = [W/2, D/2, H_wall + H_roof];
            
            // Create the hip roof using hull of base and apex
            hull() {
                // Base rectangle
                for (point = base_points) {
                    translate(point) cube(0.1);
                }
                // Apex
                translate(apex) cube(0.1);
            }
        }
        
        // Front door (Y=0 face) - centered
        translate([W/2 - door_w/2, -reveal, 0])
            cube([door_w, reveal + 1, door_h]);
        
        // Left front window (Y=0 face)
        translate([0.25*W - win_w/2, -reveal, sill_h])
            cube([win_w, reveal + 1, win_h]);
        
        // Right front window (Y=0 face)
        translate([0.75*W - win_w/2, -reveal, sill_h])
            cube([win_w, reveal + 1, win_h]);
        
        // Right-side window (X=W face)
        translate([W - reveal, 0.6*D - win_w/2, sill_h])
            cube([reveal + 1, win_w, win_h]);
        
        // Mullions for left front window (2x2 grid)
        // Vertical mullion
        translate([0.25*W - mullion/2, -reveal, sill_h])
            cube([mullion, reveal + 1, win_h]);
        // Horizontal mullion
        translate([0.25*W - win_w/2, -reveal, sill_h + win_h/2 - mullion/2])
            cube([win_w, reveal + 1, mullion]);
        
        // Mullions for right front window (2x2 grid)
        // Vertical mullion
        translate([0.75*W - mullion/2, -reveal, sill_h])
            cube([mullion, reveal + 1, win_h]);
        // Horizontal mullion
        translate([0.75*W - win_w/2, -reveal, sill_h + win_h/2 - mullion/2])
            cube([win_w, reveal + 1, mullion]);
        
        // Mullions for right-side window (2x2 grid)
        // Vertical mullion
        translate([W - reveal, 0.6*D - mullion/2, sill_h])
            cube([reveal + 1, mullion, win_h]);
        // Horizontal mullion
        translate([W - reveal, 0.6*D - win_w/2, sill_h + win_h/2 - mullion/2])
            cube([reveal + 1, win_w, mullion]);
    }
}

// Render the house
house();
