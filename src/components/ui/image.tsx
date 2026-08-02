import { imageUrl, type ImageOpts } from "~/lib/images";

type ImageProps = Omit<React.ComponentProps<"img">, "src"> &
  ImageOpts & {
    src: string | null | undefined;
    alt: string;
    width: number;
    height: number;
  };

export function Image({
  src,
  alt,
  width,
  height,
  quality,
  loading = "lazy",
  decoding = "async",
  ...rest
}: ImageProps) {
  return (
    <img
      src={imageUrl(src, { width, quality })}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      {...rest}
    />
  );
}
