export default function GreenSkeleton() {
  return (
    <div
      className="animate-pulse rounded-md bg-green-500 w-3 h-3"
      style={{ display: props.style }}
    />
  );
}
