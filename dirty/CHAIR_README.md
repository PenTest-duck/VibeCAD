# VibeCAD Chair Design - build123d

A modern, ergonomic chair design implemented using build123d, featuring configurable dimensions and modern CAD capabilities.

## Features

- **Modular Design**: Separate components for seat, backrest, legs, and armrests
- **Configurable Parameters**: Easy customization of dimensions and angles
- **Modern CAD**: Built with build123d for advanced geometric operations
- **STL Export**: Ready for 3D printing or further CAD work
- **Ergonomic Design**: Angled backrest, tapered legs, and comfortable armrests

## Components

### 1. Seat
- Rounded rectangular shape with configurable dimensions
- Cushion texture with small cylindrical bumps
- Adjustable thickness and corner radius

### 2. Backrest
- Angled design for ergonomic comfort
- Support bars for structural integrity
- Configurable angle and dimensions

### 3. Legs
- Four tapered legs for stability
- Cross braces for additional support
- Configurable taper ratio and spread

### 4. Armrests
- Integrated with backrest for stability
- Rounded top surface for comfort
- Adjustable height and length

## Usage

### Basic Usage

```python
from chair_build123d import ChairDesign

# Create a chair instance
chair = ChairDesign()

# Create and export the chair
chair.export_stl("my_chair.stl")

# Display chair information
info = chair.get_chair_info()
print(info)
```

### Customization

```python
# Create custom chair
custom_chair = ChairDesign()

# Modify dimensions
custom_chair.seat_width = 500      # Wider seat
custom_chair.seat_depth = 450      # Deeper seat
custom_chair.backrest_angle = 20   # More angled backrest
custom_chair.corner_radius = 15    # More rounded corners

# Create and export
custom_chair.export_stl("custom_chair.stl")
```

### Individual Components

```python
# Create individual components
seat = chair.create_seat()
backrest = chair.create_backrest()
legs = chair.create_legs()
armrests = chair.create_armrests()

# Export individual components
seat.export_stl("chair_seat.stl")
backrest.export_stl("chair_backrest.stl")
legs.export_stl("chair_legs.stl")
armrests.export_stl("chair_armrests.stl")
```

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `seat_width` | 400mm | Width of the seat |
| `seat_depth` | 400mm | Depth of the seat |
| `seat_height` | 450mm | Height from floor to seat |
| `seat_thickness` | 20mm | Thickness of seat cushion |
| `backrest_height` | 350mm | Height of backrest |
| `backrest_width` | 380mm | Width of backrest |
| `backrest_thickness` | 15mm | Thickness of backrest |
| `backrest_angle` | 15° | Backrest angle in degrees |
| `leg_thickness` | 25mm | Thickness of chair legs |
| `leg_spread` | 50mm | How much legs spread out at bottom |
| `armrest_height` | 200mm | Height of armrests from seat |
| `armrest_length` | 200mm | Length of armrests |
| `armrest_thickness` | 20mm | Thickness of armrests |
| `corner_radius` | 10mm | Radius for rounded corners |
| `leg_taper` | 0.7 | Leg taper ratio (1.0 = no taper) |

## Running the Examples

### Main Chair Script
```bash
python chair_build123d.py
```

### Test Script
```bash
python test_chair.py
```

## Output Files

The script generates the following STL files:
- `vibecad_chair.stl` - Complete chair assembly
- `chair_seat.stl` - Seat component only
- `chair_backrest.stl` - Backrest component only
- `chair_legs.stl` - Legs assembly only
- `chair_armrests.stl` - Armrests assembly only

## Dependencies

- build123d
- cadquery
- numpy
- typing-extensions

## Design Philosophy

This chair design follows modern ergonomic principles:

1. **Comfort**: Rounded edges and angled backrest for user comfort
2. **Stability**: Tapered legs with cross braces for structural integrity
3. **Modularity**: Separate components for easy customization and manufacturing
4. **Accessibility**: Configurable dimensions for different user needs

## Advanced Features

### Lofted Legs
The legs use build123d's lofting capabilities to create smooth tapered transitions from top to bottom.

### Rounded Corners
All major surfaces use rounded rectangles for a modern, comfortable appearance.

### Integrated Armrests
Armrests are connected to both the seat and backrest for maximum stability.

### Cushion Texture
The seat features a subtle texture pattern for visual interest and grip.

## Customization Ideas

1. **Office Chair**: Add wheels and height adjustment
2. **Dining Chair**: Remove armrests and adjust proportions
3. **Gaming Chair**: Add headrest and more aggressive angles
4. **Outdoor Chair**: Use weather-resistant materials and drainage holes

## Technical Notes

- All dimensions are in millimeters
- The design uses build123d's modern CAD operations
- STL export is optimized for 3D printing
- Individual components can be printed separately and assembled

## License

This project is part of VibeCAD - HackHarvard 2025
