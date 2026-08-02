export function ActiveTrainingPanel() {
  return (
    <div className="operator-panel space-y-4 p-4">
      <div className="border-b border-border pb-3">
        <p className="operator-label px-0 text-primary">Training State</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          Active Training
        </h3>
      </div>
      <div className="rounded border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="operator-label px-0 text-muted-foreground">
          Coming Soon
        </p>
      </div>
    </div>
  );
}
