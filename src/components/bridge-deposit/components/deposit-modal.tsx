"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { type BaseDepositProps } from "../deposit";
import { Button } from "../../ui/button";
import SimpleDeposit from "./simple-deposit";

interface DepositModalProps extends BaseDepositProps {
  heading?: string;
  destinationLabel?: string;
}

const DepositModal = ({
  address,
  token,
  chain,
  chainOptions,
  heading,
  destinationLabel,
  depositExecute,
  showHistory,
  onPreview,
  onStateChange,
  onStart,
  onComplete,
  onError,
}: DepositModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Deposit</Button>
      </DialogTrigger>
      <DialogContent className="py-4 px-1 sm:p-6">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>
        <SimpleDeposit
          address={address}
          token={token}
          chain={chain}
          chainOptions={chainOptions}
          destinationLabel={destinationLabel}
          depositExecute={depositExecute}
          showHistory={showHistory}
          onPreview={onPreview}
          onStateChange={onStateChange}
          onStart={onStart}
          onComplete={onComplete}
          onError={onError}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
