#!/usr/bin/env python3
"""
Test script for the VibeCAD Chair Design
This script tests the chair creation and exports a simple version.
"""

from chair_build123d import ChairDesign
import sys

def test_chair_creation():
    """Test basic chair creation functionality."""
    print("Testing VibeCAD Chair Design...")
    
    try:
        # Create chair instance
        chair_design = ChairDesign()
        
        # Test individual components
        print("Creating seat...")
        seat = chair_design.create_seat()
        print(f"✓ Seat created successfully")
        
        print("Creating backrest...")
        backrest = chair_design.create_backrest()
        print(f"✓ Backrest created successfully")
        
        print("Creating legs...")
        legs = chair_design.create_legs()
        print(f"✓ Legs created successfully")
        
        print("Creating armrests...")
        armrests = chair_design.create_armrests()
        print(f"✓ Armrests created successfully")
        
        print("Creating complete chair...")
        chair = chair_design.create_chair()
        print(f"✓ Complete chair created successfully")
        
        # Display chair info
        info = chair_design.get_chair_info()
        print("\nChair Specifications:")
        for key, value in info.items():
            print(f"  {key}: {value} mm")
        
        # Export STL
        print("\nExporting STL files...")
        chair_design.export_stl("test_chair.stl")
        print("✓ Chair exported to test_chair.stl")
        
        print("\n✅ All tests passed! Chair design is working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ Error during chair creation: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_customization():
    """Test chair customization options."""
    print("\nTesting chair customization...")
    
    try:
        # Create custom chair
        custom_chair = ChairDesign()
        custom_chair.seat_width = 500  # Wider seat
        custom_chair.seat_depth = 450  # Deeper seat
        custom_chair.backrest_angle = 20  # More angled backrest
        custom_chair.corner_radius = 15  # More rounded corners
        
        # Create and export custom chair
        custom_chair.export_stl("custom_chair.stl")
        print("✓ Custom chair created and exported")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during customization: {e}")
        return False

if __name__ == "__main__":
    print("VibeCAD Chair Design - Test Suite")
    print("=" * 40)
    
    # Run tests
    test1_passed = test_chair_creation()
    test2_passed = test_customization()
    
    if test1_passed and test2_passed:
        print("\n🎉 All tests passed! The chair design is ready to use.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Please check the errors above.")
        sys.exit(1)
