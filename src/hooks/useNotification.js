import { notification } from "antd";

import { useCallback } from "react";

const useNotification = () => {
  const [api, contextHolder] = notification.useNotification();
  const notify = useCallback(
    ({ type = "open", message, description }) => {
      api[type]({
        message,
        description,
        placement: "topRight",
      });
    },
    [api],
  );

  return { notify, openNotification: notify, contextHolder };
};

export default useNotification;
