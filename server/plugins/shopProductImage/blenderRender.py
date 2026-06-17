"""Update the image texture used by a Blender material in background mode.

Usage:
    python blender_set_material_image.py \
        --blender-path "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" \
        --blend-file "C:\\Users\\dariu\\Desktop\\Auftraege\\RenderTool\\FloRenderingProduct.blend" \
        --source "C:\\Users\\dariu\\Desktop\\Auftraege\\RenderTool\\ImageFlo.jpeg" \
        --output "C:\\Users\\dariu\\Desktop\\Auftraege\\RenderTool\\render.png"

The script launches Blender with --background, opens the .blend file, finds the
material named Image, replaces the first image texture node it finds in that
material's node tree, and renders the current scene settings to the requested
output path.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path


DEFAULT_BLEND_FILE = Path(__file__).with_name("FloRenderingProduct.blend")
DEFAULT_MATERIAL_NAME = "Image"
DEFAULT_NODE_NAME = "Image"


INNER_SCRIPT = textwrap.dedent(
    """
    import argparse
    import json
    import bpy
    import sys
    from pathlib import Path


    def parse_arguments() -> argparse.Namespace:
        argument_parser = argparse.ArgumentParser()
        argument_parser.add_argument("--source-image", required=True)
        argument_parser.add_argument("--output", required=True)
        argument_parser.add_argument("--material-name", default="Image")
        argument_parser.add_argument("--node-name", default="Image")
        argument_parser.add_argument("--report-progress", action="store_true")
        return argument_parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


    def emit_progress(current: int, total: int, stage: str, message: str) -> None:
        print(json.dumps({"current": current, "total": total, "stage": stage, "message": message}), flush=True)


    def find_image_node(material: bpy.types.Material, node_name: str):
        if not material.use_nodes or material.node_tree is None:
            raise RuntimeError(f"Material {material.name!r} does not use nodes.")

        nodes = list(material.node_tree.nodes)
        matching_named_nodes = [node for node in nodes if node.name == node_name or node.label == node_name]
        for node in matching_named_nodes:
            if node.type == "TEX_IMAGE":
                return node

        for node in nodes:
            if node.type == "TEX_IMAGE":
                return node

        raise RuntimeError(f"No image texture node found in material {material.name!r}.")


    def main() -> None:
        args = parse_arguments()

        source_image_path = Path(args.source_image).resolve()
        output_path = Path(args.output).resolve()

        if args.report_progress:
            emit_progress(0, 3, "load-scene", "Loading Blender scene and materials")

        material = bpy.data.materials.get(args.material_name)
        if material is None:
            raise RuntimeError(f"Material {args.material_name!r} was not found.")

        image_node = find_image_node(material, args.node_name)
        image = bpy.data.images.load(str(source_image_path), check_existing=True)
        image_node.image = image

        if args.report_progress:
            emit_progress(1, 3, "set-image", f"Assigned {source_image_path.name} to material {material.name!r}")

        scene = bpy.context.scene
        scene.render.image_settings.file_format = "PNG"
        if args.report_progress:
            emit_progress(2, 3, "render", f"Rendering to {output_path}")
        bpy.ops.render.render()

        # Save directly to the exact path — avoids Blender appending a frame
        # number (e.g. 0001) which would break the downstream pipeline.
        bpy.data.images["Render Result"].save_render(str(output_path))

        if args.report_progress:
            emit_progress(3, 3, "complete", f"Rendered {output_path}")
        print(f"Updated material {material.name!r} and rendered {output_path}")


    if __name__ == "__main__":
        main()
    """
)


def parse_arguments() -> argparse.Namespace:
    argument_parser = argparse.ArgumentParser(description="Run Blender in background mode, replace a material image texture, and render to an output file.")
    argument_parser.add_argument("--blender-path", required=True, help="Path to blender.exe.")
    argument_parser.add_argument("--blend-file", default=str(DEFAULT_BLEND_FILE), help="Path to the .blend file to open.")
    argument_parser.add_argument("--source", required=True, help="Path to the new source image.")
    argument_parser.add_argument("--output", required=True, help="Path for the rendered output image.")
    argument_parser.add_argument("--material-name", default=DEFAULT_MATERIAL_NAME, help="Name of the material to update.")
    argument_parser.add_argument("--node-name", default=DEFAULT_NODE_NAME, help="Preferred image texture node name/label.")
    argument_parser.add_argument("--report-progress", action="store_true", help="Emit JSON progress updates.")
    return argument_parser.parse_args()


def ensure_file_exists(path: Path, description: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"{description} not found: {path}")


def run_blender_update(blender_path: Path, blend_file: Path, source_image: Path, output: Path, material_name: str, node_name: str, report_progress: bool) -> None:
    with tempfile.NamedTemporaryFile("w", suffix="_blender_update.py", delete=False, encoding="utf-8") as temp_file:
        temp_file.write(INNER_SCRIPT)
        temp_script_path = Path(temp_file.name)

    command = [
        str(blender_path),
        "--background",
        str(blend_file),
        "--python",
        str(temp_script_path),
        "--",
        "--source-image",
        str(source_image),
        "--output",
        str(output),
        "--material-name",
        material_name,
        "--node-name",
        node_name,
        "--report-progress",
    ]

    if not report_progress:
        command.remove("--report-progress")

    try:
        # Capture stderr so we can surface Blender Python errors.
        # Blender exits with code 0 even when the embedded script crashes,
        # so we also verify the output file was actually written.
        proc = subprocess.Popen(
            command,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        _, blender_stderr = proc.communicate()

        if proc.returncode != 0:
            if blender_stderr:
                sys.stderr.write(blender_stderr)
            raise subprocess.CalledProcessError(proc.returncode, command)

        if not output.exists():
            # Inner script failed silently — surface Blender's stderr as the error
            detail = blender_stderr.strip() if blender_stderr else "(no stderr captured)"
            raise RuntimeError(
                f"Blender exited 0 but did not write output file: {output}\n\n"
                f"Blender stderr:\n{detail}"
            )
    finally:
        temp_script_path.unlink(missing_ok=True)


def main() -> None:
    args = parse_arguments()

    blender_path = Path(args.blender_path).expanduser()
    blend_file = Path(args.blend_file).expanduser()
    source_image = Path(args.source).expanduser()
    output = Path(args.output).expanduser()

    ensure_file_exists(blender_path, "Blender executable")
    ensure_file_exists(blend_file, "Blend file")
    ensure_file_exists(source_image, "Source image")
    output.parent.mkdir(parents=True, exist_ok=True)

    run_blender_update(
        blender_path=blender_path,
        blend_file=blend_file,
        source_image=source_image,
        output=output,
        material_name=args.material_name,
        node_name=args.node_name,
        report_progress=args.report_progress,
    )


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        print(f"Blender failed with exit code {exc.returncode}", file=sys.stderr)
        raise