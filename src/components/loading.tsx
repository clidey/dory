import { Spinner } from '@clidey/ux';
import classNames from "classnames";

type ILoadingProps = {
  className?: string;
  showText?: boolean;
  loadingText?: string;
  textClassName?: string;
}

export const Loading = ({ className, showText = false, loadingText, textClassName }: ILoadingProps) => {
  return (
    <div className="h-full w-full flex flex-col justify-center items-center gap-2 min-h-[400px]" role="status">
      <Spinner className={className} />
      {
        showText &&
        <div className={classNames("text-sm text-gray-500", textClassName)}>{ loadingText ?? "Loading..."}</div>
      }
    </div>
  )
}