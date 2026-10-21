// Format the amount as Philippine pesos so prices and payments are easy to recognize.
export const money = (value: string | number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value),
  );
