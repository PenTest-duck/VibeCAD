#!/usr/bin/env python3
"""
VibeCAD Chair Design - Example Variations
This script demonstrates different chair configurations and styles.
"""

from chair_build123d import ChairDesign
from build123d import *

def create_office_chair():
    """Create an office-style chair with wider seat and more support."""
    print("Creating office chair...")
    
    office_chair = ChairDesign()
    
    # Office chair modifications
    office_chair.seat_width = 450
    office_chair.seat_depth = 420
    office_chair.backrest_height = 400
    office_chair.backrest_angle = 12
    office_chair.armrest_height = 220
    office_chair.armrest_length = 250
    office_chair.corner_radius = 15
    
    # Export
    office_chair.export_stl("office_chair.stl")
    print("✓ Office chair exported to office_chair.stl")

def create_dining_chair():
    """Create a dining-style chair without armrests."""
    print("Creating dining chair...")
    
    dining_chair = ChairDesign()
    
    # Dining chair modifications
    dining_chair.seat_width = 380
    dining_chair.seat_depth = 380
    dining_chair.seat_height = 450
    dining_chair.backrest_height = 300
    dining_chair.backrest_angle = 8
    dining_chair.armrest_height = 0  # No armrests
    dining_chair.armrest_length = 0
    dining_chair.corner_radius = 8
    
    # Create chair without armrests
    with BuildPart() as dining_build:
        add(dining_chair.create_seat())
        add(dining_chair.create_backrest())
        add(dining_chair.create_legs())
        # Skip armrests for dining chair
    
    dining_build.part.export_stl("dining_chair.stl")
    print("✓ Dining chair exported to dining_chair.stl")

def create_gaming_chair():
    """Create a gaming-style chair with aggressive angles and headrest."""
    print("Creating gaming chair...")
    
    gaming_chair = ChairDesign()
    
    # Gaming chair modifications
    gaming_chair.seat_width = 420
    gaming_chair.seat_depth = 400
    gaming_chair.seat_height = 400
    gaming_chair.backrest_height = 500  # Taller for headrest
    gaming_chair.backrest_angle = 25    # More aggressive angle
    gaming_chair.armrest_height = 180
    gaming_chair.armrest_length = 220
    gaming_chair.corner_radius = 12
    
    # Create gaming chair with headrest
    with BuildPart() as gaming_build:
        add(gaming_chair.create_seat())
        add(gaming_chair.create_backrest())
        add(gaming_chair.create_legs())
        add(gaming_chair.create_armrests())
        
        # Add headrest
        with BuildSketch() as headrest_sketch:
            # Create rounded rectangle using offset
            Rectangle(width=gaming_chair.backrest_width - 50 - 30, 
                    height=80 - 30)
            
            # Offset to create rounded corners
            offset(amount=15)
        
        with Locations((0, gaming_chair.seat_depth/2 + gaming_chair.backrest_thickness/2 + 20,
                      gaming_chair.seat_height + gaming_chair.backrest_height + 40)):
            with Rot(axis=Axis.X, angle=gaming_chair.backrest_angle):
                extrude(amount=30)
    
    gaming_build.part.export_stl("gaming_chair.stl")
    print("✓ Gaming chair exported to gaming_chair.stl")

def create_outdoor_chair():
    """Create an outdoor chair with drainage and weather considerations."""
    print("Creating outdoor chair...")
    
    outdoor_chair = ChairDesign()
    
    # Outdoor chair modifications
    outdoor_chair.seat_width = 400
    outdoor_chair.seat_depth = 400
    outdoor_chair.seat_height = 450
    outdoor_chair.backrest_height = 350
    outdoor_chair.backrest_angle = 15
    outdoor_chair.armrest_height = 200
    outdoor_chair.armrest_length = 200
    outdoor_chair.corner_radius = 8
    outdoor_chair.leg_thickness = 30  # Thicker for outdoor use
    
    # Create outdoor chair with drainage holes
    with BuildPart() as outdoor_build:
        add(outdoor_chair.create_seat())
        add(outdoor_chair.create_backrest())
        add(outdoor_chair.create_legs())
        add(outdoor_chair.create_armrests())
        
        # Add drainage holes to seat
        with BuildSketch(Plane.XY.offset(outdoor_chair.seat_height + outdoor_chair.seat_thickness/2)) as drainage_sketch:
            for i in range(-2, 3):
                for j in range(-2, 3):
                    x = i * outdoor_chair.seat_width / 8
                    y = j * outdoor_chair.seat_depth / 8
                    with Locations((x, y)):
                        Circle(radius=3)
            make_face()
        
        # Cut drainage holes
        with Locations((0, 0, outdoor_chair.seat_height + outdoor_chair.seat_thickness/2)):
            extrude(amount=5, mode=Mode.SUBTRACT)
    
    outdoor_build.part.export_stl("outdoor_chair.stl")
    print("✓ Outdoor chair exported to outdoor_chair.stl")

def create_compact_chair():
    """Create a compact chair for small spaces."""
    print("Creating compact chair...")
    
    compact_chair = ChairDesign()
    
    # Compact chair modifications
    compact_chair.seat_width = 350
    compact_chair.seat_depth = 350
    compact_chair.seat_height = 400
    compact_chair.backrest_height = 300
    compact_chair.backrest_angle = 10
    compact_chair.armrest_height = 150
    compact_chair.armrest_length = 150
    compact_chair.corner_radius = 6
    compact_chair.leg_thickness = 20
    compact_chair.leg_spread = 30
    
    compact_chair.export_stl("compact_chair.stl")
    print("✓ Compact chair exported to compact_chair.stl")

def main():
    """Create all chair variations."""
    print("VibeCAD Chair Design - Example Variations")
    print("=" * 50)
    
    # Create different chair styles
    create_office_chair()
    create_dining_chair()
    create_gaming_chair()
    create_outdoor_chair()
    create_compact_chair()
    
    print("\n🎉 All chair variations created successfully!")
    print("\nGenerated files:")
    print("  - office_chair.stl")
    print("  - dining_chair.stl")
    print("  - gaming_chair.stl")
    print("  - outdoor_chair.stl")
    print("  - compact_chair.stl")
    
    print("\nEach chair is optimized for its specific use case:")
    print("  • Office: Wider seat, more support")
    print("  • Dining: No armrests, classic proportions")
    print("  • Gaming: Aggressive angles, headrest")
    print("  • Outdoor: Drainage holes, thicker legs")
    print("  • Compact: Smaller dimensions for tight spaces")

if __name__ == "__main__":
    main()
