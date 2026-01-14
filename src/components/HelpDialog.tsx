import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Commented out for future use - table-based control instructions
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import controlInstructions from "@/data/control-instructions.json";
import { Gamepad2, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface HelpDialogProps {
  className?: string;
  children?: React.ReactNode;
}

export function HelpDialog({ className, children }: HelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={children ? "default" : "icon"}
          className={cn(children ? "" : "h-9 w-9", className)}
        >
          <HelpCircle
            className={cn("h-5 w-5", children && "mr-2 h-3.5 w-3.5")}
          />
          {children ? children : <span className="sr-only">Control Help</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-6 w-6" />
            SO-100 PS5 Controller Help
          </DialogTitle>
          <DialogDescription>
            PS5 controller instructions for SO-100 robot arm
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <img
            src="/help/so_100_ps5_help.png"
            alt="SO-100 PS5 Controller Instructions"
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Commented out for future use - table-based control instructions */}
        {/* <div className="space-y-6 mt-4">
          {controlInstructions.controls.map((category, index) => (
            <div key={index} className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                {category.category}
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Input</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.items.map((item, itemIndex) => (
                      <TableRow key={itemIndex}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10">
                            {item.input}
                          </span>
                        </TableCell>
                        <TableCell>{item.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div> */}
      </DialogContent>
    </Dialog>
  );
}
