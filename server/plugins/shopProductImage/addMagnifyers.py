"""Place numbered circular zoom crops of a source image onto a rendered scene.

Usage:
	python addMagnifyers.py --scene Rednered.jpg --source ImageFlo.jpeg --output output.png

The script treats TRAPEZOID_POINTS as the corners of the source image inside the
rendered scene. It samples random points in the source image, projects them into
the trapezoid, marks each projected point with a numbered badge, and pastes a
matching numbered circular crop of the source image at the hardcoded destination
positions (top-left, top-right, bottom-left, bottom-right).
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path
from typing import List, Sequence, Tuple

try:
	from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:  # pragma: no cover - dependency guard
	raise SystemExit("This script requires Pillow. Install it with: pip install pillow") from exc


Point = Tuple[float, float]


# Hardcoded scene points for the trapezoid that contains the source image.
# Edit these to match the rendered image geometry.
TRAPEZOID_POINTS: List[Point] = [
	(287, 280),
	(887, 372),
	(836, 798),
	(226, 710),
]

# Number of random zoom-circle placements.
NUM_POINTS = 4

# Minimum gap between badge bounding boxes.
BUBBLE_GAP = 40

# Final rendered diameter of the circular bubble.
CIRCLE_DISPLAY_DIAMETER = 300

# Higher values mean a tighter crop and a stronger zoom.
CIRCLE_ZOOM_FACTOR = 1

# Diameter sampled from the original image before it gets zoomed up.
CIRCLE_SAMPLE_DIAMETER = max(1, CIRCLE_DISPLAY_DIAMETER // CIRCLE_ZOOM_FACTOR)


# Reject sampled points whose color is close to white, black, or gray
# (i.e. low saturation), since these are likely borders/background rather
# than actual image content.
REQUIRE_COLORFUL_PIXEL = True

# Minimum difference between the max and min RGB channel values for a pixel
# to be considered "colorful" (not gray/white/black). 0-255 scale.
MIN_COLOR_SATURATION = 18

# Pixels brighter than this (average of R,G,B) are treated as near-white.
MAX_BRIGHTNESS = 245

# Pixels darker than this (average of R,G,B) are treated as near-black.
MIN_BRIGHTNESS = 10

# Width in pixels of the border drawn around each circular crop.
CIRCLE_BORDER_WIDTH = 3

# Color of the border drawn around each circular crop (RGBA).
CIRCLE_BORDER_COLOR = (30, 30, 30, 255)

# Diameter in pixels of the small numbered badge placed at the magnifier tip
# and at the inner corner of each circular crop.
BADGE_DIAMETER = 35
BADGE_DIAMETER_CUTOUT = 80

# Fill color of the numbered badge (RGBA).
BADGE_FILL_COLOR = (30, 30, 30, 255)

# Text color of the number inside the badge (RGBA).
BADGE_TEXT_COLOR = (255, 255, 255, 255)


def solve_linear_system(matrix: Sequence[Sequence[float]], values: Sequence[float]) -> List[float]:
	size = len(values)
	augmented = [list(row) + [float(values[index])] for index, row in enumerate(matrix)]

	for column in range(size):
		pivot_row = max(range(column, size), key=lambda row: abs(augmented[row][column]))
		pivot_value = augmented[pivot_row][column]
		if abs(pivot_value) < 1e-12:
			raise ValueError("Could not build a stable perspective transform from the provided points.")

		if pivot_row != column:
			augmented[column], augmented[pivot_row] = augmented[pivot_row], augmented[column]

		pivot_value = augmented[column][column]
		for item in range(column, size + 1):
			augmented[column][item] /= pivot_value

		for row in range(size):
			if row == column:
				continue
			factor = augmented[row][column]
			if factor == 0:
				continue
			for item in range(column, size + 1):
				augmented[row][item] -= factor * augmented[column][item]

	return [augmented[index][size] for index in range(size)]


def build_homography(source_points: Sequence[Point], destination_points: Sequence[Point]) -> List[float]:
	if len(source_points) != 4 or len(destination_points) != 4:
		raise ValueError("Homography requires exactly four source points and four destination points.")

	matrix: List[List[float]] = []
	values: List[float] = []

	for (source_x, source_y), (dest_x, dest_y) in zip(source_points, destination_points):
		matrix.append([source_x, source_y, 1.0, 0.0, 0.0, 0.0, -dest_x * source_x, -dest_x * source_y])
		values.append(dest_x)
		matrix.append([0.0, 0.0, 0.0, source_x, source_y, 1.0, -dest_y * source_x, -dest_y * source_y])
		values.append(dest_y)

	return solve_linear_system(matrix, values)


def transform_point(homography: Sequence[float], x_coord: float, y_coord: float) -> Point:
	denominator = homography[6] * x_coord + homography[7] * y_coord + 1.0
	if abs(denominator) < 1e-12:
		raise ValueError("A projected point landed on the transform horizon.")

	output_x = (homography[0] * x_coord + homography[1] * y_coord + homography[2]) / denominator
	output_y = (homography[3] * x_coord + homography[4] * y_coord + homography[5]) / denominator
	return output_x, output_y


def load_rgba(path: Path) -> Image.Image:
	return Image.open(path).convert("RGBA")


def paste_with_alpha(base: Image.Image, overlay: Image.Image, top_left_x: int, top_left_y: int) -> None:
	base.paste(overlay, (int(top_left_x), int(top_left_y)), overlay)


def make_zoomed_circular_crop(source: Image.Image, center_x: int, center_y: int, sample_diameter: int, output_diameter: int) -> Image.Image:
	sample_radius = sample_diameter // 2
	left = center_x - sample_radius
	top = center_y - sample_radius
	crop = source.crop((left, top, left + sample_diameter, top + sample_diameter)).convert("RGBA")
	crop = crop.resize((output_diameter, output_diameter), Image.Resampling.LANCZOS)

	mask = Image.new("L", (output_diameter, output_diameter), 0)
	draw = ImageDraw.Draw(mask)
	draw.ellipse((0, 0, output_diameter - 1, output_diameter - 1), fill=255)
	crop.putalpha(mask)

	if CIRCLE_BORDER_WIDTH > 0:
		draw.ellipse(
			(0, 0, output_diameter - 1, output_diameter - 1),
			outline=255,
			width=CIRCLE_BORDER_WIDTH,
		)
		border_layer = Image.new("RGBA", (output_diameter, output_diameter), (0, 0, 0, 0))
		border_draw = ImageDraw.Draw(border_layer)
		border_draw.ellipse(
			(0, 0, output_diameter - 1, output_diameter - 1),
			outline=CIRCLE_BORDER_COLOR,
			width=CIRCLE_BORDER_WIDTH,
		)
		crop.alpha_composite(border_layer)

	return crop


def load_badge_font(diameter: int) -> ImageFont.ImageFont:
	font_size = int(diameter * 0.4)
	try:
		return ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
	except OSError:
		return ImageFont.load_default()


def draw_numbered_badge(image: Image.Image, center_x: int, center_y: int, number: int, diameter: int) -> None:
	"""Draw a small filled circle with a centered number onto image, centered at (center_x, center_y)."""
	radius = diameter // 2
	draw = ImageDraw.Draw(image)
	draw.ellipse(
		(center_x - radius, center_y - radius, center_x + radius, center_y + radius),
		fill=BADGE_FILL_COLOR,
	)

	text = str(number)
	font = load_badge_font(diameter)
	bbox = draw.textbbox((0, 0), text, font=font)
	text_width = bbox[2] - bbox[0]
	text_height = bbox[3] - bbox[1]
	text_x = center_x - text_width / 2 - bbox[0]
	text_y = center_y - text_height / 2 - bbox[1]
	draw.text((text_x, text_y), text, fill=BADGE_TEXT_COLOR, font=font)


def circle_inner_corner(destination_x: int, destination_y: int, diameter: int, scene: Image.Image) -> Tuple[int, int]:
	"""Return the point on the circle's bounding box closest to the scene center,
	used as the anchor for the numbered badge ("inner corner")."""
	center_x = destination_x + diameter / 2
	center_y = destination_y + diameter / 2
	scene_center_x = scene.width / 2
	scene_center_y = scene.height / 2

	corner_x = destination_x + 10 if center_x < scene_center_x else destination_x + diameter - 10
	corner_y = destination_y + 10 if center_y < scene_center_y else destination_y + diameter - 10
	return int(corner_x), int(corner_y)


def is_colorful_pixel(source: Image.Image, x_coord: int, y_coord: int) -> bool:
	if not REQUIRE_COLORFUL_PIXEL:
		return True

	red, green, blue = source.getpixel((x_coord, y_coord))[:3]
	brightness = (red + green + blue) / 3.0

	if brightness >= MAX_BRIGHTNESS or brightness <= MIN_BRIGHTNESS:
		return False

	saturation = max(red, green, blue) - min(red, green, blue)
	return saturation >= MIN_COLOR_SATURATION


def random_source_point(rng: random.Random, width: int, height: int, sample_diameter: int) -> Tuple[int, int]:
	sample_radius = sample_diameter // 2
	if width <= sample_diameter or height <= sample_diameter:
		raise ValueError("The source image must be larger than the circular sample diameter.")

	x_coord = rng.randint(sample_radius, width - sample_radius - 1)
	y_coord = rng.randint(sample_radius, height - sample_radius - 1)
	return x_coord, y_coord


def badge_bbox_for_point(scene_x: float, scene_y: float, diameter: int) -> Tuple[int, int, int, int]:
	radius = diameter // 2
	left = int(round(scene_x)) - radius
	top = int(round(scene_y)) - radius
	return left, top, left + diameter, top + diameter


def point_fits_scene(scene: Image.Image, scene_x: float, scene_y: float, diameter: int) -> bool:
	left, top, right, bottom = badge_bbox_for_point(scene_x, scene_y, diameter)
	return left >= 0 and top >= 0 and right <= scene.width and bottom <= scene.height


def boxes_overlap(first: Tuple[int, int, int, int], second: Tuple[int, int, int, int], gap: int) -> bool:
	first_left, first_top, first_right, first_bottom = first
	second_left, second_top, second_right, second_bottom = second

	return not (
		first_right + gap <= second_left
		or second_right + gap <= first_left
		or first_bottom + gap <= second_top
		or second_bottom + gap <= first_top
	)


def choose_safe_source_point(
	rng: random.Random,
	scene: Image.Image,
	source: Image.Image,
	homography: Sequence[float],
	existing_boxes: Sequence[Tuple[int, int, int, int]],
	source_width: int,
	source_height: int,
	max_attempts: int = 5000,
) -> Tuple[int, int, float, float]:
	# First pass: respect the colorful-pixel filter.
	# Second pass: relax it so images with low saturation still work.
	for require_color in (True, False):
		for _ in range(max_attempts):
			source_x, source_y = random_source_point(rng, source_width, source_height, CIRCLE_SAMPLE_DIAMETER)
			if require_color and not is_colorful_pixel(source, source_x, source_y):
				continue
			scene_x, scene_y = transform_point(homography, float(source_x), float(source_y))
			if point_fits_scene(scene, scene_x, scene_y, BADGE_DIAMETER):
				candidate_box = badge_bbox_for_point(scene_x, scene_y, BADGE_DIAMETER)
				if all(not boxes_overlap(candidate_box, existing_box, BUBBLE_GAP) for existing_box in existing_boxes):
					return source_x, source_y, scene_x, scene_y
	raise ValueError(
		f"Could not find a badge position that fits inside the scene after {max_attempts * 2} attempts. "
		f"Scene size: {scene.width}x{scene.height}, badge diameter: {BADGE_DIAMETER}. "
		f"Check that TRAPEZOID_POINTS match the rendered scene geometry."
	)


def build_circle_destinations(scene: Image.Image) -> List[Tuple[int, int]]:
	margin = 40
	return [
		(margin, margin),
		(scene.width - CIRCLE_DISPLAY_DIAMETER - margin, margin),
		(margin, scene.height - CIRCLE_DISPLAY_DIAMETER - margin),
		(scene.width - CIRCLE_DISPLAY_DIAMETER - margin, scene.height - CIRCLE_DISPLAY_DIAMETER - margin),
	]


def parse_hex_color(value: str) -> Tuple[int, int, int, int]:
	normalized = value.strip().lstrip("#")
	if len(normalized) == 6:
		red = int(normalized[0:2], 16)
		green = int(normalized[2:4], 16)
		blue = int(normalized[4:6], 16)
		return red, green, blue, 255
	if len(normalized) == 8:
		red = int(normalized[0:2], 16)
		green = int(normalized[2:4], 16)
		blue = int(normalized[4:6], 16)
		alpha = int(normalized[6:8], 16)
		return red, green, blue, alpha
	raise argparse.ArgumentTypeError(f"Expected a hex color like #RRGGBB or #RRGGBBAA, got {value!r}.")


def emit_progress(current: int, total: int, stage: str, message: str) -> None:
	print(json.dumps({"current": current, "total": total, "stage": stage, "message": message}), flush=True)


def parse_arguments() -> argparse.Namespace:
	parser = argparse.ArgumentParser(description="Add numbered circular zoom crops of a source image onto a rendered scene.")
	parser.add_argument("--scene", required=True, help="Rendered image that contains the trapezoid.")
	parser.add_argument("--source", required=True, help="Original image mapped into the trapezoid.")
	parser.add_argument("--output", default="output.png", help="Output file path.")
	parser.add_argument("--seed", type=int, default=None, help="Optional random seed for repeatable placements.")
	parser.add_argument("--material-name", default="Image", help="Accepted for server compatibility.")
	parser.add_argument("--node-name", default="Image", help="Accepted for server compatibility.")
	parser.add_argument("--num-points", type=int, default=NUM_POINTS, help="Number of magnification points to place.")
	parser.add_argument("--circle-zoom-factor", type=int, default=CIRCLE_ZOOM_FACTOR, help="Zoom factor used for the circular crop.")
	parser.add_argument("--circle-border-width", type=int, default=CIRCLE_BORDER_WIDTH, help="Border width drawn around each circular crop.")
	parser.add_argument("--circle-border-color", default="#1e1e1eff", help="Border color in hex format.")
	parser.add_argument("--badge-diameter", type=int, default=BADGE_DIAMETER, help="Diameter of the badge drawn on the magnification point.")
	parser.add_argument("--badge-diameter-cutouts", type=int, default=BADGE_DIAMETER_CUTOUT, help="Diameter of the badge drawn on the circular cutout.")
	parser.add_argument("--badge-fill-color", default="#1e1e1eff", help="Badge fill color in hex format.")
	parser.add_argument("--badge-text-color", default="#ffffffff", help="Badge text color in hex format.")
	parser.add_argument("--report-progress", action="store_true", help="Emit JSON progress updates to stdout.")
	return parser.parse_args()


def main() -> None:
	args = parse_arguments()
	rng = random.Random(args.seed)

	global NUM_POINTS, CIRCLE_ZOOM_FACTOR, CIRCLE_SAMPLE_DIAMETER, CIRCLE_BORDER_WIDTH
	global CIRCLE_BORDER_COLOR, BADGE_DIAMETER, BADGE_DIAMETER_CUTOUT, BADGE_FILL_COLOR, BADGE_TEXT_COLOR

	NUM_POINTS = max(1, args.num_points)
	CIRCLE_ZOOM_FACTOR = max(1, args.circle_zoom_factor)
	CIRCLE_SAMPLE_DIAMETER = max(1, CIRCLE_DISPLAY_DIAMETER // CIRCLE_ZOOM_FACTOR)
	CIRCLE_BORDER_WIDTH = max(0, args.circle_border_width)
	CIRCLE_BORDER_COLOR = parse_hex_color(args.circle_border_color)
	BADGE_DIAMETER = max(1, args.badge_diameter)
	BADGE_DIAMETER_CUTOUT = max(1, args.badge_diameter_cutouts)
	BADGE_FILL_COLOR = parse_hex_color(args.badge_fill_color)
	BADGE_TEXT_COLOR = parse_hex_color(args.badge_text_color)

	scene_path = Path(args.scene)
	source_path = Path(args.source)
	output_path = Path(args.output)

	scene = load_rgba(scene_path)
	source = load_rgba(source_path)

	source_points: List[Point] = [
		(0.0, 0.0),
		(float(source.width - 1), 0.0),
		(float(source.width - 1), float(source.height - 1)),
		(0.0, float(source.height - 1)),
	]
	homography = build_homography(source_points, TRAPEZOID_POINTS)

	result = scene.copy()
	circle_destinations = build_circle_destinations(result)
	placed_boxes: List[Tuple[int, int, int, int]] = []

	if args.report_progress:
		emit_progress(0, NUM_POINTS, "start", "Starting magnifier composition")

	for index in range(NUM_POINTS):
		source_x, source_y, scene_x, scene_y = choose_safe_source_point(
			rng,
			scene,
			source,
			homography,
			placed_boxes,
			source.width,
			source.height,
		)

		placed_boxes.append(badge_bbox_for_point(scene_x, scene_y, BADGE_DIAMETER))

		circle = make_zoomed_circular_crop(source, source_x, source_y, CIRCLE_SAMPLE_DIAMETER, CIRCLE_DISPLAY_DIAMETER)
		destination_x, destination_y = circle_destinations[index % len(circle_destinations)]
		paste_with_alpha(result, circle, destination_x, destination_y)

		badge_number = index + 1
		draw_numbered_badge(result, int(round(scene_x)), int(round(scene_y)), badge_number, BADGE_DIAMETER)
		corner_x, corner_y = circle_inner_corner(destination_x, destination_y, CIRCLE_DISPLAY_DIAMETER, result)
		draw_numbered_badge(result, corner_x, corner_y, badge_number, BADGE_DIAMETER_CUTOUT)

		if args.report_progress:
			emit_progress(index + 1, NUM_POINTS, "compose", f"Placed magnifier {index + 1} of {NUM_POINTS}")

	if args.report_progress:
		emit_progress(NUM_POINTS, NUM_POINTS, "done", "Magnifier composition completed")

	output_path.parent.mkdir(parents=True, exist_ok=True)
	if output_path.suffix.lower() in {".jpg", ".jpeg"}:
		result.convert("RGB").save(output_path)
	else:
		result.save(output_path)

	print(f"Saved {output_path}")


if __name__ == "__main__":
	main()