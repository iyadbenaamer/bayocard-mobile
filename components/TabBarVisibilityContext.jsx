import { createContext, useContext } from "react";

const TabBarVisibilityContext = createContext({
  setHidden: () => {},
});

export const useTabBarVisibility = () => useContext(TabBarVisibilityContext);

export default TabBarVisibilityContext;
