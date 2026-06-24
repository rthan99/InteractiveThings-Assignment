interface PopupPositionInput {
  anchorX: number
  anchorY: number
  containerWidth: number
  containerHeight: number
  popupWidth: number
  popupHeight: number
  margin?: number
  offset?: number
}

export function computePopupPosition({
  anchorX,
  anchorY,
  containerWidth,
  containerHeight,
  popupWidth,
  popupHeight,
  margin = 10,
  offset = 14,
}: PopupPositionInput): { left: number; top: number } {
  let left = anchorX + offset
  let top = anchorY + offset

  if (left + popupWidth > containerWidth - margin) {
    left = anchorX - popupWidth - offset
  }

  if (left < margin) {
    left = Math.max(margin, (containerWidth - popupWidth) / 2)
  }

  if (top + popupHeight > containerHeight - margin) {
    top = containerHeight - popupHeight - margin
  }

  if (top < margin) {
    top = margin
  }

  return { left, top }
}
