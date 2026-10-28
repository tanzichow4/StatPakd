# T12: 2D Radar chart
**Phase:** 2 · **Size:** M · **Depends on:** T10

## Scope
Handoff "2D Radar": needs at least 3 stats, otherwise show "Pick at least 3 stats for the radar." 520x420 viewBox, center (260,210), R=150, 4 rings, polygon per entity (2px stroke, 0.06 fill, r3.5 dots), HTML overlay labels, legend with series-color left border. Lower-is-better stats inverted.

## Acceptance criteria
- [ ] Vertex positions are computed by a pure, tested function.
- [ ] Fewer than 3 stats shows the message and no chart.
- [ ] Null values plot at the center and are noted in the legend or tooltip.
- [ ] Labels do not overlap the chart at the default size.
