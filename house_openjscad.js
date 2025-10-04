// house_openjscad.js - Simple house with hip (pyramidal) roof
// Units: millimeters
// Axes: X = left↔right, Y = front↔back (front at Y=0), Z = up
// Origin: lower-front-left corner of the main footprint

// Parameters
const W = 6000;              // overall width (X)
const D = 4500;              // overall depth (Y)
const H_wall = 3000;         // wall height to eaves
const t_wall = 150;          // wall thickness for shell
const roof_overhang = 250;   // uniform overhang on all sides
const H_roof = 2200;         // apex height above eaves
const door_w = 900;          // door width
const door_h = 2000;         // door height
const win_w = 900;           // window width
const win_h = 900;           // window height
const mullion = 60;          // mullion thickness
const sill_h = 1000;         // window sill height above ground
const reveal = 50;           // door/window inset depth

function main() {
    return house();
}

function house() {
    // Main house body with hip roof
    const mainBody = union(
        // Wall shell - rectangular prism footprint shelled inward
        difference(
            cube({size: [W, D, H_wall]}),
            translate([t_wall, t_wall, 0], 
                cube({size: [W - 2*t_wall, D - 2*t_wall, H_wall]}))
        ),
        
        // Hip roof - pyramidal roof with overhang
        hipRoof()
    );
    
    // Cut out openings
    return difference(
        mainBody,
        // Front door (Y=0 face) - centered
        translate([W/2 - door_w/2, -reveal, 0],
            cube({size: [door_w, reveal + 1, door_h]})),
        
        // Left front window (Y=0 face)
        translate([0.25*W - win_w/2, -reveal, sill_h],
            cube({size: [win_w, reveal + 1, win_h]})),
        
        // Right front window (Y=0 face)
        translate([0.75*W - win_w/2, -reveal, sill_h],
            cube({size: [win_w, reveal + 1, win_h]})),
        
        // Right-side window (X=W face)
        translate([W - reveal, 0.6*D - win_w/2, sill_h],
            cube({size: [reveal + 1, win_w, win_h]})),
        
        // Mullions for left front window (2x2 grid)
        // Vertical mullion
        translate([0.25*W - mullion/2, -reveal, sill_h],
            cube({size: [mullion, reveal + 1, win_h]})),
        // Horizontal mullion
        translate([0.25*W - win_w/2, -reveal, sill_h + win_h/2 - mullion/2],
            cube({size: [win_w, reveal + 1, mullion]})),
        
        // Mullions for right front window (2x2 grid)
        // Vertical mullion
        translate([0.75*W - mullion/2, -reveal, sill_h],
            cube({size: [mullion, reveal + 1, win_h]})),
        // Horizontal mullion
        translate([0.75*W - win_w/2, -reveal, sill_h + win_h/2 - mullion/2],
            cube({size: [win_w, reveal + 1, mullion]})),
        
        // Mullions for right-side window (2x2 grid)
        // Vertical mullion
        translate([W - reveal, 0.6*D - mullion/2, sill_h],
            cube({size: [reveal + 1, mullion, win_h]})),
        // Horizontal mullion
        translate([W - reveal, 0.6*D - win_w/2, sill_h + win_h/2 - mullion/2],
            cube({size: [reveal + 1, win_w, mullion]}))
    );
}

function hipRoof() {
    // Create the hip roof as a polyhedron
    // Base rectangle with overhang
    const basePoints = [
        [-roof_overhang, -roof_overhang, H_wall],
        [W + roof_overhang, -roof_overhang, H_wall],
        [W + roof_overhang, D + roof_overhang, H_wall],
        [-roof_overhang, D + roof_overhang, H_wall]
    ];
    
    // Apex point at center
    const apex = [W/2, D/2, H_wall + H_roof];
    
    // Create polyhedron points
    const points = [
        ...basePoints,
        apex
    ];
    
    // Define faces for the hip roof
    const faces = [
        [0, 1, 4], // Front face
        [1, 2, 4], // Right face  
        [2, 3, 4], // Back face
        [3, 0, 4], // Left face
        [0, 3, 2, 1] // Base face
    ];
    
    return polyhedron({points: points, faces: faces});
}
