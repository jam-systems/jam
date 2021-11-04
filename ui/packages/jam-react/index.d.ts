export {Jam as default};

declare function Jam(props: {
  jamUrl?: string;
  roomId: string;
  params?: {
    room?: {
      name?: string;
      description?: string;
      color?: string;
      stageOnly?: boolean;
    };
    ux?: {
      autoCreate?: boolean;
      autoJoin?: boolean;
      autoRejoin?: boolean;
      noLeave?: boolean;
    };
    identity?: {
      name?: string;
      avatar?: string;
    };
    keys?: {
      seed?: string;
    };
  };
}): JSX.Element;
