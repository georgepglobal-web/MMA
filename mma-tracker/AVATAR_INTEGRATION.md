# Avatar Integration Guide

## ✅ Completed Implementation

### 1. AvatarImage Component (`app/components/AvatarImage.tsx`)
- ✅ Created reusable `AvatarImage` component
- ✅ Explicit level-to-image mapping (Novice, Intermediate, Seasoned, Elite)
- ✅ Smooth transition animation (fade + scale, ~200ms)
- ✅ Fallback placeholder if images don't exist
- ✅ Three size variants: `sm`, `md`, `lg`
- ✅ Optional glow effect matching level colors
- ✅ TypeScript types for all props

### 2. Component Integration
- ✅ Updated `HomePage` to display avatar image based on level
- ✅ Updated `AvatarEvolutionPage` to show larger avatar image
- ✅ Avatar automatically switches when level changes
- ✅ Smooth transitions between levels

### 3. Image Structure
- ✅ Created `/public/avatars/` directory
- ✅ Added README with image specifications
- ✅ Defined clear naming convention

## 📋 Next Steps: Add Avatar Images

### Required Images
Place 4 PNG images in `/public/avatars/`:

1. **fighter-novice.png**
   - Lean but underdeveloped physique
   - Narrow shoulders, limited muscle definition
   - Neutral posture
   - Plain rashguard

2. **fighter-intermediate.png**
   - Noticeable muscle growth (shoulders, chest, arms)
   - Improved posture
   - Subtle vascularity / definition
   - Better-fitted gear

3. **fighter-seasoned.png**
   - Clearly athletic build
   - Visible muscle separation (delts, chest, arms)
   - Slightly wider frame
   - Signs of training (tape, light scars, worn gloves)

4. **fighter-elite.png**
   - Peak athletic physique
   - Broad shoulders, thick neck, powerful arms
   - Lean and conditioned (not bulky)
   - Calm, dominant presence
   - Premium-looking gear

### Image Requirements
- **Format**: PNG (transparent or dark/neutral background)
- **Aspect Ratio**: Square (1:1)
- **Resolution**: Minimum 512x512px, recommended 1024x1024px+
- **Style**: Semi-realistic illustration or high-quality stylized render
- **Content**: Front-facing bust (head + shoulders)
- **Consistency**: Same character, same pose, same camera angle, same lighting
- **Character**: Neutral ethnicity, consistent facial features

## 🎨 Features

### Automatic Level Switching
The avatar image automatically updates when the fighter levels up:
- Novice → Intermediate
- Intermediate → Seasoned
- Seasoned → Elite

### Smooth Transitions
- 200ms fade + scale animation
- Smooth ease-in-out timing
- Loading state during image change

### Responsive Design
- Three size variants for different contexts
- Mobile-friendly scaling
- Maintains aspect ratio

### Fallback Behavior
If images are missing, displays gradient placeholder with level initials.

## 🔧 Technical Details

### Image Path Mapping
```typescript
const AVATAR_IMAGES = {
  Novice: "/avatars/fighter-novice.png",
  Intermediate: "/avatars/fighter-intermediate.png",
  Seasoned: "/avatars/fighter-seasoned.png",
  Elite: "/avatars/fighter-elite.png",
};
```

### Usage Example
```tsx
<AvatarImage
  level="Novice"
  size="md"
  showGlow={true}
  className="mb-4"
/>
```

### Component Props
- `level`: "Novice" | "Intermediate" | "Seasoned" | "Elite" (required)
- `size`: "sm" | "md" | "lg" (optional, default: "md")
- `showGlow`: boolean (optional, default: true)
- `className`: string (optional, for additional styling)

## 📱 Pages Using Avatar

1. **HomePage** - Medium size avatar with level badge
2. **AvatarEvolutionPage** - Large size avatar with full details

## ✨ Animation Details

- **Duration**: 200ms
- **Easing**: ease-in-out
- **Effects**: 
  - Opacity fade (0 → 1)
  - Scale (0.95 → 1.0)
  - Smooth transition between levels

All animations are CSS-based (no JavaScript libraries required) and performant.
