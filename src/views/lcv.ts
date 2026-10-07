export function lcvInteract(edge: {
  event: string;
  from: string;
  success: string;
  fail: string;
  interrupted: string;
}): LcvEdge {
  return {
    "data-lcv-event": edge.event,
    "data-lcv-from": edge.from,
    "data-lcv-to-success": edge.success,
    "data-lcv-to-fail": edge.fail,
    "data-lcv-to-interrupted": edge.interrupted,
  };
}

export function lcvMachine(name: string, state: string, states: string): LcvMachine {
  return {
    "data-lcv-machine": name,
    "data-lcv-ui-state": state,
    "data-lcv-states": states,
  };
}

export function lcvStay(event: string, state: string) {
  return lcvInteract({
    event,
    from: state,
    success: state,
    fail: state,
    interrupted: state,
  });
}

export type LcvEdge = {
  "data-lcv-event": string;
  "data-lcv-from": string;
  "data-lcv-to-success": string;
  "data-lcv-to-fail": string;
  "data-lcv-to-interrupted": string;
};

export type LcvMachine = {
  "data-lcv-machine": string;
  "data-lcv-ui-state": string;
  "data-lcv-states": string;
};
