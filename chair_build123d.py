#!/usr/bin/env python3
"""
VibeCAD Chair Design using build123d
A modern, ergonomic chair with configurable dimensions
HackHarvard 2025

This module creates a complete chair assembly using build123d,
featuring a seat, backrest, legs, and armrests with modern CAD capabilities.
"""

from build123d import *
import math
from typing import Tuple, List


class ChairDesign:
    """Configurable chair design using build123d."""
    
    def __init__(self):
        # ===== CONFIGURABLE PARAMETERS =====
        # Chair dimensions (in mm)
        self.seat_width = 400           # Width of the seat
        self.seat_depth = 400           # Depth of the seat
        self.seat_height = 450          # Height from floor to seat
        self.seat_thickness = 20        # Thickness of seat cushion
        
        self.backrest_height = 350      # Height of backrest
        self.backrest_width = 380       # Width of backrest
        self.backrest_thickness = 15    # Thickness of backrest
        self.backrest_angle = 15        # Backrest angle in degrees
        
        self.leg_thickness = 25         # Thickness of chair legs
        self.leg_spread = 50            # How much legs spread out at bottom
        
        self.armrest_height = 200       # Height of armrests from seat
        self.armrest_length = 200       # Length of armrests
        self.armrest_thickness = 20     # Thickness of armrests
        
        # Design parameters
        self.corner_radius = 10         # Radius for rounded corners
        self.leg_taper = 0.7            # Leg taper ratio (1.0 = no taper)
        
        # Internal calculated values
        self.leg_positions = self._calculate_leg_positions()
        self.armrest_positions = self._calculate_armrest_positions()
    
    def _calculate_leg_positions(self) -> List[Tuple[float, float]]:
        """Calculate the positions of the four chair legs."""
        return [
            (self.seat_width/2 - self.leg_spread, self.seat_depth/2 - self.leg_spread),
            (-self.seat_width/2 + self.leg_spread, self.seat_depth/2 - self.leg_spread),
            (self.seat_width/2 - self.leg_spread, -self.seat_depth/2 + self.leg_spread),
            (-self.seat_width/2 + self.leg_spread, -self.seat_depth/2 + self.leg_spread)
        ]
    
    def _calculate_armrest_positions(self) -> List[Tuple[float, float]]:
        """Calculate the positions of the armrests."""
        return [
            (self.seat_width/2 + self.armrest_thickness/2, 0),
            (-self.seat_width/2 - self.armrest_thickness/2, 0)
        ]
    
    def create_seat(self) -> Part:
        """Create the chair seat with rounded corners and cushion texture."""
        with BuildPart() as seat_build:
            # Main seat base
            with BuildSketch() as seat_sketch:
                # Create rounded rectangle using offset
                Rectangle(width=self.seat_width - 2*self.corner_radius, 
                        height=self.seat_depth - 2*self.corner_radius)
                
                # Offset to create rounded corners
                offset(amount=self.corner_radius)
            
            # Extrude the seat
            extrude(amount=self.seat_thickness)
            
            # Add cushion texture (small cylindrical bumps)
            with BuildSketch(Plane.XY.offset(self.seat_thickness/2)) as texture_sketch:
                for i in range(-1, 2):
                    for j in range(-1, 2):
                        x = i * self.seat_width / 6
                        y = j * self.seat_depth / 6
                        with Locations((x, y)):
                            Circle(radius=3)
                make_face()
            
            # Extrude texture slightly
            extrude(amount=2)
        
        return seat_build.part
    
    def create_backrest(self) -> Part:
        """Create the angled backrest with support bars."""
        with BuildPart() as backrest_build:
            # Main backrest panel
            with BuildSketch() as backrest_sketch:
                # Create rounded rectangle using offset
                Rectangle(width=self.backrest_width - 2*self.corner_radius, 
                        height=self.backrest_thickness - 2*self.corner_radius)
                
                # Offset to create rounded corners
                offset(amount=self.corner_radius)
            
            # Position and rotate the backrest
            with Locations((0, self.seat_depth/2 + self.backrest_thickness/2, 
                          self.seat_height + self.backrest_height/2)):
                with Rot(axis=Axis.X, angle=self.backrest_angle):
                    extrude(amount=self.backrest_height)
                    
                    # Add support bars
                    with BuildSketch() as support_sketch:
                        for i in range(-1, 2):
                            x = i * self.backrest_width / 3
                            with Locations((x, 0)):
                                Rectangle(width=5, height=self.backrest_thickness + 10)
                    
                    # Extrude support bars
                    with Locations((0, 0, -self.backrest_height/2 + 10)):
                        extrude(amount=self.backrest_height - 20)
        
        return backrest_build.part
    
    def create_leg(self, position: Tuple[float, float]) -> Part:
        """Create a single tapered chair leg with cross brace."""
        x_pos, y_pos = position
        
        with BuildPart() as leg_build:
            # Main leg (tapered)
            with BuildSketch() as leg_sketch:
                # Top of leg
                Rectangle(
                    width=self.leg_thickness,
                    height=self.leg_thickness
                )
            
            # Create tapered leg using loft
            with Locations((0, 0, -self.seat_height)):
                with BuildSketch() as leg_bottom_sketch:
                    Rectangle(
                        width=self.leg_thickness * self.leg_taper,
                        height=self.leg_thickness * self.leg_taper
                    )
                
                # Create loft between top and bottom
                loft()
            
            # Add cross brace for stability
            with Locations((0, 0, -self.seat_height/2)):
                with Rot(axis=Axis.Z, angle=90):
                    with BuildSketch() as brace_sketch:
                        Rectangle(
                            width=self.leg_thickness/2,
                            height=self.leg_thickness
                        )
                    extrude(amount=self.seat_width/3)
        
        # Position the leg
        with Locations((x_pos, y_pos, 0)):
            return leg_build.part
    
    def create_legs(self) -> Part:
        """Create all four chair legs."""
        legs = []
        for position in self.leg_positions:
            legs.append(self.create_leg(position))
        
        # Combine all legs
        with BuildPart() as legs_build:
            for leg in legs:
                add(leg)
        
        return legs_build.part
    
    def create_armrest(self, position: Tuple[float, float]) -> Part:
        """Create a single armrest with support and connection to backrest."""
        x_pos, y_pos = position
        
        with BuildPart() as armrest_build:
            # Armrest support post
            with BuildSketch() as support_sketch:
                Rectangle(
                    width=self.armrest_thickness,
                    height=self.leg_thickness
                )
            
            # Position support post
            with Locations((0, 0, self.seat_height + self.armrest_height/2)):
                extrude(amount=self.armrest_height)
                
                # Armrest top
                with BuildSketch() as armrest_top_sketch:
                    # Create rounded rectangle using offset
                    Rectangle(width=self.armrest_thickness - 10, 
                            height=self.armrest_length - 10)
                    
                    # Offset to create rounded corners
                    offset(amount=5)
                
                with Locations((0, 0, self.armrest_height/2)):
                    extrude(amount=15)
                
                # Connection to backrest
                with Locations((0, self.seat_depth/2, 
                              self.backrest_height/2 - self.armrest_height/2)):
                    with Rot(axis=Axis.X, angle=self.backrest_angle):
                        with BuildSketch() as connection_sketch:
                            Rectangle(
                                width=self.armrest_thickness,
                                height=10
                            )
                        extrude(amount=self.backrest_height/2)
        
        # Position the armrest
        with Locations((x_pos, y_pos, 0)):
            return armrest_build.part
    
    def create_armrests(self) -> Part:
        """Create both armrests."""
        armrests = []
        for position in self.armrest_positions:
            armrests.append(self.create_armrest(position))
        
        # Combine all armrests
        with BuildPart() as armrests_build:
            for armrest in armrests:
                add(armrest)
        
        return armrests_build.part
    
    def create_footrest(self) -> Part:
        """Create an optional footrest."""
        with BuildPart() as footrest_build:
            with BuildSketch() as footrest_sketch:
                # Create rounded rectangle using offset
                Rectangle(width=self.seat_width - 100 - 2*self.corner_radius, 
                        height=200 - 2*self.corner_radius)
                
                # Offset to create rounded corners
                offset(amount=self.corner_radius)
            
            with Locations((0, self.seat_depth/2 + 100, 200)):
                extrude(amount=15)
        
        return footrest_build.part
    
    def create_chair(self, include_footrest: bool = False) -> Part:
        """Create the complete chair assembly."""
        with BuildPart() as chair_build:
            # Core components
            add(self.create_seat())
            add(self.create_backrest())
            add(self.create_legs())
            add(self.create_armrests())
            
            # Optional footrest
            if include_footrest:
                add(self.create_footrest())
        
        return chair_build.part
    
    def export_stl(self, filename: str = "chair.stl", include_footrest: bool = False):
        """Export the chair to STL format."""
        chair = self.create_chair(include_footrest)
        chair.export_stl(filename)
        print(f"Chair exported to {filename}")
    
    def show_chair(self, include_footrest: bool = False):
        """Display the chair (requires appropriate viewer)."""
        chair = self.create_chair(include_footrest)
        chair.show()
    
    def get_chair_info(self) -> dict:
        """Get information about the chair dimensions."""
        return {
            "seat_width": self.seat_width,
            "seat_depth": self.seat_depth,
            "seat_height": self.seat_height,
            "backrest_height": self.backrest_height,
            "total_height": self.seat_height + self.backrest_height,
            "leg_count": len(self.leg_positions),
            "armrest_count": len(self.armrest_positions)
        }


def main():
    """Main function to create and export the chair."""
    print("VibeCAD Chair Design - build123d")
    print("=" * 40)
    
    # Create chair instance
    chair_design = ChairDesign()
    
    # Display chair information
    info = chair_design.get_chair_info()
    print("Chair Specifications:")
    for key, value in info.items():
        print(f"  {key}: {value} mm")
    
    print("\nCreating chair...")
    
    # Create the chair
    chair = chair_design.create_chair(include_footrest=False)
    
    # Export to STL
    chair_design.export_stl("vibecad_chair.stl")
    
    print("\nChair creation complete!")
    print("Files generated:")
    print("  - vibecad_chair.stl (main chair)")
    
    # Optional: Create individual components for testing
    print("\nCreating individual components...")
    
    # Export individual components
    seat = chair_design.create_seat()
    seat.export_stl("chair_seat.stl")
    
    backrest = chair_design.create_backrest()
    backrest.export_stl("chair_backrest.stl")
    
    legs = chair_design.create_legs()
    legs.export_stl("chair_legs.stl")
    
    armrests = chair_design.create_armrests()
    armrests.export_stl("chair_armrests.stl")
    
    print("Individual components exported:")
    print("  - chair_seat.stl")
    print("  - chair_backrest.stl")
    print("  - chair_legs.stl")
    print("  - chair_armrests.stl")


if __name__ == "__main__":
    main()
