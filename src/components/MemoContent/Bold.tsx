import { Node } from "@/types/proto/api/v2/markdown_service";
import Renderer from "./Renderer";

interface Props {
  symbol: string;
  children: Node[];
}

const Bold: React.FC<Props> = ({ children }: Props) => {
  return (
    <strong>
      {children.map((child, index) => (
        <Renderer key={`${child.type}-${index}`} node={child} />
      ))}
    </strong>
  );
};

export default Bold;
