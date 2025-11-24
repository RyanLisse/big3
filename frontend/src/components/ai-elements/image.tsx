import type { Experimental_GeneratedImage } from "ai";
import NextImage from "next/image";
import { cn } from "@/lib/utils";

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export const Image = ({
  base64,
  uint8Array,
  mediaType,
  width = 300,
  height = 200,
  ...props
}: ImageProps) => (
  <NextImage
    {...props}
    alt={props.alt || ""}
    className={cn("max-w-full overflow-hidden rounded-md", props.className)}
    height={height}
    src={`data:${mediaType};base64,${base64}`}
    width={width}
  />
);
