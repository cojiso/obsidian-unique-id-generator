// Zero-pads to width digits so that sorting as strings matches numeric order.
export function encodeBase36(n: number, width: number): string {
	if (!Number.isSafeInteger(n) || n < 0) {
		throw new RangeError(`Expected a non-negative safe integer: ${n}`)
	}
	return n.toString(36).padStart(width, '0')
}
