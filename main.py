import cadquery as cq
from cadquery import exporters

result = (cq.Workplane("XY")
          .circle(20)
          .extrude(40)
          .faces(">Z").workplane()
          .circle(18)
          .cutThruAll())
result.export("mug.stl")
