---
description: Describe when these instructions should be loaded
# applyTo: 'Describe when these instructions should be loaded' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---
# Multi-Persona Zero-Trust Audit Framework

## Beagle Recovery Apartment — Capability & Review Board Reference

---

## MEDICAL CONTEXT

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| Species      | Beagle (28 lbs, 12" shoulder height)                           |
| Condition    | Cervical herniated disc (C3-C4)                                |
| Surgery      | Post-decompression/stabilization                               |
| Recovery     | 6-12 weeks strict confinement                                  |
| Restrictions | No jumping, climbing, neck extension/flexion, sudden movements |
| Enclosure    | 50×50×30" playpen with 1.3" memory foam mat                    |

**Injury mechanics:** Neck flexion = spinal cord compression. Extension = nerve root impingement. Rotation = destabilization. Impact = surgical site disruption.

---

## EXPERT REVIEW BOARD (6 PERSONAS)

### 1. Veterinary Neurologist

**Lens:** Spinal alignment, neck angles at all interaction points, step height biomechanics, fall/impact prevention, emergency access.

**Audit scope:**

- Bowl height vs. neutral neck (shoulder height ±2")
- Max safe step height (<3" post-op)
- Entry/exit sequence cumulative elevation
- Bed bolster vs. spine support trade-off
- Floor impact absorption adequacy
- Gap → limb entrapment → twisting injury
- Caregiver monitoring sightlines

**Risk scores:** CRITICAL (red) = immediate spinal cord injury | HIGH (orange) = likely pain/inflammation | MODERATE (yellow) = potential discomfort | LOW (green) = acceptable

### 2. Certified Veterinary Rehabilitation Therapist (CCRP)

**Lens:** Muscle atrophy prevention, passive ROM maintenance, surface textures, weight distribution during transitions, progressive mobility.

**Audit scope:**

- Bed-to-mat step muscle loading
- Movement pattern analysis (preferred paths)
- Surface texture variation (grip)
- Rear leg support (beagle gait mechanics)
- Progressive configuration evolution (early vs. late recovery)
- Exercise space allocation

### 3. Animal Behaviorist (CAAB)

**Lens:** Confinement stress, resource guarding in small space, elimination behavior, enrichment, anxiety indicators, breed-specific considerations.

**Audit scope:**

- Visual barrier analysis (frustration triggers)
- Territory zoning (sleep vs. eat vs. eliminate separation)
- Enrichment item placement
- Human interaction zones (sitting with dog without entering)
- Escape attempt risk points (door, wall climb)
- Boredom prevention (scent work compatibility)

### 4. Structural Engineer (PE)

**Lens:** Load-bearing capacity, connection failure modes, gap tolerances, material fatigue, assembly error prevention, tipping stability.

**Audit scope:**

- Corner joint shear strength (28lb impact)
- Tube wall thickness for impact resistance
- Gap measurements vs. ASTM F1169 (<3.5" head entrapment)
- Floor mat compression over time
- Mesh wall tear propagation (claw puncture → rip)
- Center of gravity (bed stack height stability)

### 5. Hygiene & Infection Control Specialist (CVT)

**Lens:** Contamination spread patterns, material cleanability, moisture barriers, bacterial/fungal growth, surgical site infection risk.

**Audit scope:**

- Washable pad coverage vs. elimination patterns
- Bed material permeability (urine wicking)
- Floor mat cleaning method
- High-touch surface disinfection access
- Moisture migration paths (urine → bed contamination)
- Ventilation adequacy (ammonia buildup)

### 6. Caregiver Ergonomics Consultant (OT)

**Lens:** Daily care accessibility, emergency access speed, cleaning burden, dog removal/return safety, visual monitoring, medication administration.

**Audit scope:**

- Door height vs. caregiver back strain (lifting 28lb over threshold)
- Reach distance to rear corners (clean without entering?)
- Bowl refill spill risk & frequency
- Pad change without disturbing sleeping dog
- Sightline monitoring from other rooms
- Photography positioning for vet updates

---

## ZERO-TRUST AUDIT LAYERS

### Layer 1: Dimensional Verification

Trust no measurement without cross-validation. Compare product specs, customer reviews, and CAD model values. Document tolerance ranges (±0.5" acceptable, ±1" flagged). Model worst-case scenarios.

### Layer 2: Interaction Point Analysis

Every beagle-to-environment contact surface evaluated:

- Entry threshold, mat-to-pad transition, pad-to-bed step, bowl rim contact, bed bolster compression, wall proximity, door zipper

For each: height differential, surface hardness, grip/traction, gap dimensions, force vectors.

### Layer 3: Temporal Simulation

Safety degrades over time. Track across: Hour 1 (novelty stress) → Days 1-3 (acute post-op) → Week 1 (adaptation) → Weeks 2-4 (increasing mobility) → Weeks 5-8 (boredom risks) → Weeks 9-12 (escape attempts). Include material fatigue, contamination accumulation, behavioral adaptation, caregiver fatigue.

### Layer 4: Failure Mode & Effects Analysis (FMEA)

Categories: structural, material, design, human error, behavioral override.
Score each: Severity (1-10) × Likelihood (1-10) × Detection difficulty (1-10) = Risk Priority Number. Document mitigation for each.

### Layer 5: Configuration Stress Testing

Scenario simulations: midnight emergency removal, seizure near wall, vomiting cleanup, medication refusal, houseguest disruption, pet sitter unfamiliarity.

---

## AVAILABLE DELIVERABLE TYPES

| Category          | Deliverables                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visualization** | Safety audit overlay, persona toggle (view through each expert's lens), risk heatmap, measurement annotations, configuration comparison, timeline scrubber, failure scenario playback, certification dashboard |
| **Data**          | Dimensional database, gap analysis matrix, height map, interaction point catalog, FMEA report, temporal risk timeline                                                                                          |
| **Reports**       | Executive summary, detailed technical report, mitigation action plan, vet consultation package, caregiver training guide, emergency response procedures, 12-week monitoring checklist                          |

---

## EXISTING PROJECT ASSETS

- React Three Fiber 3D visualization (React 18 + Vite + Three.js)
- Three configuration modes: Suite, Buffer, Hygiene
- Adjustable beagle dimensions (shoulder height, weight)
- Basic safety audit mode (color-coding red/yellow/green)
- Measurement tooltips on hover
- Screenshot export
- Validated measurements from Amazon products
- Documentation (README, QUICK_REFERENCE)

---

## HOW TO USE THIS FRAMEWORK

Tell the assistant which aspect to work on. Examples:

- _"Run Persona 1 (Neurologist) audit on the Suite configuration"_
- _"Build the risk heatmap visualization"_
- _"Generate the FMEA report for structural failures"_
- _"Add the persona toggle system to the 3D viewer"_
- _"Audit Layer 2 interaction points for the entry threshold"_
- _"Create the 12-week temporal risk timeline component"_
- _"Run all 6 personas on the bowl stand heights"_

The assistant will apply the relevant persona lens, audit layer, or build the specified feature using the existing codebase and framework definitions above.
