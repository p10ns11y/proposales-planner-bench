import { Badge } from "../design/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../design/ui/table";
import type { ResultsViewModel } from "../view-models/view-model";

export function ResultsView({ viewModel }: { viewModel: ResultsViewModel }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4" aria-label="Results">
      <h2 className="text-lg">Results</h2>
      {viewModel.rows.length === 0 ? (
        <p className="text-muted">Offers show up here after you add venue proposals.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venue</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead>Food</TableHead>
              <TableHead>Space</TableHead>
              <TableHead>Extras</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Gaps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viewModel.rows.map((row) => (
              <TableRow key={row.venueName} data-venue={row.venueName} data-gap={row.gaps.length > 0 ? "missing" : "clear"}>
                <TableCell>{row.venueName}</TableCell>
                <TableCell>{row.rooms}</TableCell>
                <TableCell>{row.foodAndBeverage}</TableCell>
                <TableCell>{row.space}</TableCell>
                <TableCell>{row.extras}</TableCell>
                <TableCell>{row.total}</TableCell>
                <TableCell>{row.expires}</TableCell>
                <TableCell>
                  {row.gaps.length === 0 ? (
                    <Badge tone="clear">Clear</Badge>
                  ) : (
                    row.gaps.map((gap) => (
                      <Badge key={gap} tone="missing">
                        {gap}
                      </Badge>
                    ))
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
