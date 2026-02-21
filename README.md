# 🐕 Beagle Recovery Apartment - 3D CAD Visualizer

An interactive 3D visualization tool for a post-spine-surgery beagle recovery playpen, built with React Three Fiber and Three.js.

## 🏥 Medical Context

This application was designed to help plan and visualize a safe recovery environment for a 28lb beagle recovering from a herniated disc in the neck. The tool allows caregivers to:

- Compare different furniture configurations
- Identify potential safety hazards (step heights, gaps, neck angles)
- Adjust layouts for optimal recovery conditions
- Export snapshots for veterinary consultation

## ✨ Features

### 🎯 Three Configuration Modes

1. **Suite Mode** - Comfort-focused layout with side-by-side beds and step access
2. **Buffer Mode** - Perimeter cushioning to prevent wall impacts during movement
3. **Hygiene Focus** - Maximized open floor space for large washable pee pads

### 🔬 Safety Audit System

Multi-layered safety analysis:
- **Medical Persona**: Spine alignment, neck angle calculations, step height validation  
- **Practical Persona**: Hygiene zones, moisture barriers, caregiver ergonomics
- **Behavioral Persona**: Movement patterns, reach distances, grip/traction analysis
- **Zero Trust Technical**: Gap measurements, structural integrity, hazard identification

### 🎨 Interactive Controls

- **Adjustable Beagle Dimensions**: Shoulder height (10"-14"), weight (20-35 lbs)
- **View Modes**: Toggle between perspective and top-down orthographic views
- **Safety Mode**: Color-coded risk zones (red = danger, yellow = caution, green = safe)
- **Animation Toggle**: Floating indicator over water bowl
- **Screenshot Export**: Capture current view as PNG for sharing

### 📏 Measurement System

Hover over any object to see exact dimensions (L × W × H), height above floor level, and object purpose.

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
npm run build
npm run preview  # Preview production build
```

## 📁 Project Structure

```
src/
├── components/
│   ├── Scene.jsx              # Main 3D scene coordinator
│   ├── Playpen.jsx            # 50×50 enclosure with frame, walls, floor
│   ├── Bed.jsx                # Full bed (bolster) and pad-only variants
│   ├── BowlStand.jsx          # Elevated bowl stand with animation
│   ├── PeePad.jsx             # Washable and disposable pads
│   ├── ControlPanel.jsx       # UI overlay with all controls
│   └── MeasurementTooltip.jsx # Hover tooltips for dimensions
│
├── hooks/
│   └── useConfiguration.js    # Layout configurations (Suite, Buffer, Hygiene)
│
├── utils/
│   └── screenshot.js          # Canvas export utility
│
├── App.jsx                    # Main app with Canvas setup
├── main.jsx                   # React entry point
└── index.css                  # Tailwind imports and global styles
```

## 📐 Validated Measurements

All dimensions based on actual products:

| Item | Dimensions | Height Above Floor |
|------|-----------|-------------------|
| Pen Interior | 50" × 50" | 1" (elevated frame) |
| Floor Mat | 50" × 50" × 1.3" | 2.3" surface |
| Full Bed | 29" × 18" × 8" | 10.3" (bolster rim) |
| Interior Pad | 25" × 14" × 3" | 5.3" surface |
| Bowl Stand | 10" × 10" base | 4.9" or 8.7" adjustable |
| Washable Pad | 36" × 36" | 2.3" (on mat) |

## 🎨 Color Legend

**Safety Mode OFF:**
- Slate Grey - Memory foam beds
- Sky Blue - Hygiene pads  
- Dark Grey/Amber - Bowl stands
- Coral Pink - Floor mat

**Safety Mode ON:**
- Red - Critical hazards (entry gap, high jumps)
- Yellow/Amber - Caution zones (steps, transitions)
- Green - Safe clearances

## ⚠️ Safety Audit Highlights

### Critical Issues (Red)
- 1.5" entry gap with hard surface
- Door threshold at 1"
- Bed-to-bed gaps >0.5"

### Caution Zones (Yellow)
- Mat transition (1.3" step)
- Interior pad step (3")
- Bowl reach distances

## 🐾 Usage Tips

1. Start with **Suite Mode** for initial recovery
2. Enable **Safety Audit** to identify hazards
3. Adjust **Beagle Size** for your dog's dimensions
4. Use **Top-Down View** for measuring gaps
5. Export **Screenshots** to share with your vet

## 📝 License

Open source - available for personal use.

## 🙏 Acknowledgments

Built for beagle recovery with love and precision. May your pup heal quickly! 🐕‍🦺💙

---

**Medical Disclaimer**: This tool is for planning purposes only. Always consult your veterinarian regarding post-surgical care.
