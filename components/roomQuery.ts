// When the home page is the 3D room: a landscape screen at least 768 CSS px
// wide, used with a mouse or trackpad. (Laptops with 125–150% display
// scaling are often under 1024 CSS px, so the bar is lower than that.)
// Shared by HomeSwitch and the inline script in the layout that hides the
// classic page before first paint. WebGL is checked separately.
export const ROOM_QUERY = "(min-width: 768px) and (min-aspect-ratio: 1/1) and (pointer: fine)";
