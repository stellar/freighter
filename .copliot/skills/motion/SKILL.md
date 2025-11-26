---
name: ui-motion-and-animation
description: Guidelines for building performant, natural-feeling UI animations using CSS, JavaScript, and Motion / Framer Motion, including easing curves, timing rules, performance constraints, and Radix UI integration patterns.
---

# UI Motion & Animation

## Overview
This Skill defines concrete rules and best practices for implementing UI animations that feel fast, natural, and responsive. It provides prescriptive easing curves, duration guidance, Motion / Framer Motion patterns, performance constraints, and Radix UI integration techniques.

Use this Skill whenever generating, reviewing, or modifying UI animations, transitions, or motion-related behavior.

---
# Animation Best Practices
 
## 1. Easing
 
Use custom easing functions over built-in CSS easings for more natural motion.
 
### ease-out (Elements entering or exiting / user interactions)
 
```css
--ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
--ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1);
--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
--ease-out-circ: cubic-bezier(0.075, 0.82, 0.165, 1);
```
 
### ease-in-out (Elements moving within the screen)
 
```css
--ease-in-out-quad: cubic-bezier(0.455, 0.03, 0.515, 0.955);
--ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
--ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
--ease-in-out-quint: cubic-bezier(0.86, 0, 0.07, 1);
--ease-in-out-expo: cubic-bezier(1, 0, 0, 1);
--ease-in-out-circ: cubic-bezier(0.785, 0.135, 0.15, 0.86);
```
 
### ease-in (Should generally be avoided as it makes the UI feel slow.)
 
```css
--ease-in-quad: cubic-bezier(0.55, 0.085, 0.68, 0.53);
--ease-in-cubic: cubic-bezier(0.55, 0.055, 0.675, 0.19);
--ease-in-quart: cubic-bezier(0.895, 0.03, 0.685, 0.22);
--ease-in-quint: cubic-bezier(0.755, 0.05, 0.855, 0.06);
--ease-in-expo: cubic-bezier(0.95, 0.05, 0.795, 0.035);
--ease-in-circ: cubic-bezier(0.6, 0.04, 0.98, 0.335);
```
 
## 2. Duration & Timing
 
- **Hover transitions**: Use `transition: property 200ms ease` for `color`, `background-color`, `opacity`
- **Spring animations**: When using Motion/Framer Motion using Spring animations usually results in a better animation. Avoid using bouncy spring animations unless you are working with drag gestures.
- **Make your UI feel fast**: Keep in mind that most animations should be fast. We want the user to feel that the UI is responsive and listens to him. No animation should be longer than 1s, unless it's illustrative.
- **Origin-aware**: Animate from the trigger (e.g., dropdown animates from button). Set `transform-origin` accordingly
 
## 3. Motion/Framer Motion
 
- Prefer **spring animations** for natural feel (avoid bouncy springs unless using drag gestures)
- Use `transform` instead of `x`/`y` for hardware acceleration:
 
```tsx
// Prefer this (hardware accelerated)
<motion.div style={{ transform: "translateX(100px)" }} />
 
// Over this
<motion.div animate={{ x: 100 }} />
```
 
## 4. Performance
 
- **Animate mostlyx**: `opacity`, `transform`
- **Avoid**: Animating `top`, `left`, `width`, `height` — use `transform` instead
- **Blur**: Keep blur values ≤ 20px
- **will-change**: Use sparingly, only for `transform`, `opacity`, `clipPath`, `filter`
- **Never** animate drag gestures with CSS variables
 
## 5. Radix UI Integration
 
### Adding animations
 
Use `asChild` with a `motion` component:
 
```tsx
<Dialog.Content asChild>
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
  >
    {children}
  </motion.div>
</Dialog.Content>
```
 
### Exit & layout animations
 
Hoist state and use `AnimatePresence` with `forceMount`:
 
```tsx
const [open, setOpen] = useState(false);
 
return (
  <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger>Open</Dialog.Trigger>
    <AnimatePresence>
      {open && (
        <Dialog.Content forceMount asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        </Dialog.Content>
      )}
    </AnimatePresence>
  </Dialog.Root>
);
```