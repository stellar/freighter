export const download = ({
  filename,
  content,
}: {
  filename: string;
  content: string;
}) => {
  const el = document.createElement("a");
  const file = new Blob([content], { type: "text/plain" });
  el.href = URL.createObjectURL(file);
  el.download = filename;
  document.body.appendChild(el);
  el.click();
};
