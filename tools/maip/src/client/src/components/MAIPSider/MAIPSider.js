import React from "react";
import { Layout, Menu } from "antd";

import "./styles.css";

const { Sider } = Layout;
const MAIPSider = ({ defaultKey, items, rightSide, theme }) => {
  // Convert items to Antd 5 format
  const menuItems = items.map((i) => ({
    key: i.key,
    icon: i.icon,
    label: i.href ? <a href={i.href}>{i.text}</a> : i.text,
    onClick: i.action
  }));

  return (
    <Sider className="side-background-color" breakpoint="lg" collapsedWidth="0">
      <Menu
        mode="inline"
        theme={theme ? theme : "light"}
        style={
          rightSide
            ? { height: "100%", borderRight: 0 }
            : { height: "100%", borderLeft: 10 }
        }
        defaultSelectedKeys={[`${defaultKey}`]}
        defaultOpenKeys={[`sub${defaultKey}`]}
        items={menuItems}
      />
    </Sider>
  );
};

export default MAIPSider;
