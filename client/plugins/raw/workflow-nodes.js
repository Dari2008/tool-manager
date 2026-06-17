export default [
  {
    type:     "raw/image",
    title:    "Raw Image",
    category: "Raw",
    inputs: [
      { key: "url", name: "Image URL", type: "text", configOnly: true, defaultValue: "" },
    ],
    outputs: [
      { key: "image", name: "Image", type: "image" },
    ],
  },
  {
    type:     "raw/upload-output",
    title:    "Save to Raw",
    category: "Raw",
    inputs: [
      { key: "image",    name: "Image",    type: "image" },
      { key: "filename", name: "Filename", configOnly: true, defaultValue: "output.jpg" },
    ],
    outputs: [],
  },
];
