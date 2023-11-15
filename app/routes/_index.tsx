import { useState } from 'react';
import { Chip } from '@nextui-org/chip';
import { Skeleton } from '@nextui-org/skeleton';
import { Switch } from '@nextui-org/switch';
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from '@nextui-org/navbar';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize.js';
import dayjs from 'dayjs';
import RelativeTime from 'dayjs/plugin/relativeTime.js';
import { useSocket } from '../socket';
import { GitHubIcon } from '../images/GitHubIcon';
import { MoonIcon } from '../images/MoonIcon';
import { SunIcon } from '../images/SunIcon';
import type { MetaFunction } from '@remix-run/node';
dayjs.extend(RelativeTime);

const EVENT = {
  name: "Handshake's 4-year anniversary",
  desc: "Block 210240 marks 4 years since Handshake's mainnet genesis. It is also the time when the reserved name claim period ends and those names are available for auction.",
  height: 210240,
};

export const meta: MetaFunction = () => {
  return [
    { title: 'Countdown | HTools Calendar' },
    { name: 'description', content: 'Countdown to Handshake-specific events.' },
  ];
};

function Header({ setTheme }: { setTheme: any }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [toggle, setToggle] = useState(false);

  function handleThemeToggle(selected: boolean) {
    setTheme(selected ? 'light' : 'dark');
    setToggle(selected);
  }

  const menuItems = ['Event Countdown'];

  return (
    <Navbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className='fixed'
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className='sm:hidden'
        />
        <NavbarBrand>
          <p className='font-bold text-inherit'>
            <a
              className='underline underline-offset-4'
              href='https://htools.work'
              target='_blank'
              rel='noreferrer noopener'
              aria-label='HTools Main Website'
            >
              HTools
            </a>{' '}
            <span>Calendar</span>
          </p>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className='hidden gap-4 sm:flex' justify='center'>
        {/* <NavbarItem isActive>
          <Link href='#' aria-current='page'>
            Event Countdown
          </Link>
        </NavbarItem> */}
        {/* <NavbarItem>
          <Link color='foreground' href='#'>
            Features
          </Link>
        </NavbarItem> */}
      </NavbarContent>
      <NavbarContent justify='end'>
        <NavbarItem className='hidden sm:flex'>
          <Switch
            isSelected={toggle}
            size='lg'
            color='secondary'
            thumbIcon={({ isSelected, className }) =>
              isSelected ? (
                <SunIcon className={className} />
              ) : (
                <MoonIcon className={className} />
              )
            }
            onValueChange={handleThemeToggle}
          ></Switch>
        </NavbarItem>
        <NavbarItem className='hidden sm:flex'>
          <a
            href='https://github.com/htools-org/htools-calendar'
            target='_blank'
            rel='noreferrer noopener'
            aria-label='GitHub'
            color='foreground'
          >
            <GitHubIcon />
          </a>
        </NavbarItem>
        {/* <NavbarItem>
          <Button as={Link} color='primary' href='#' variant='flat'>
            Sign Up
          </Button>
        </NavbarItem> */}
      </NavbarContent>

      <NavbarMenu>
        {/* {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item}-${index}`}>
            <Link className='w-full' href='#' size='lg'>
              {item}
            </Link>
          </NavbarMenuItem>
        ))} */}
        <NavbarMenuItem>
          <Switch
            isSelected={toggle}
            size='lg'
            color='secondary'
            thumbIcon={({ isSelected, className }) =>
              isSelected ? (
                <SunIcon className={className} />
              ) : (
                <MoonIcon className={className} />
              )
            }
            onValueChange={handleThemeToggle}
          ></Switch>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
}

function Countdown() {
  const { isConnected, currentHeight } = useSocket();

  const blocksRemaining = EVENT.height - currentHeight;

  let timeRemaining = '...';
  let blockText = `block #${EVENT.height}`;

  if (isConnected) {
    if (blocksRemaining === 0) {
      timeRemaining = 'right about now!';
    } else if (blocksRemaining > 0) {
      blockText =
        `in ${blocksRemaining} ${pluralize(blocksRemaining, 'block')} - ` +
        blockText;
      timeRemaining = dayjs().to(
        dayjs().add(blocksRemaining * 10, 'minute'),
        false
      );
    } else {
      blockText =
        `${-blocksRemaining} ${pluralize(blocksRemaining, 'block')} ago - ` +
        blockText;
      timeRemaining = dayjs().to(
        dayjs().add(blocksRemaining * 10, 'minute'),
        false
      );
    }
  }

  // https://github.com/streamich/react-use/issues/2353
  // @ts-ignore
  const { width, height } = useWindowSize.default();

  return (
    <section className='flex flex-col justify-center min-h-screen px-4'>
      <div className='max-w-md mx-auto text-center'>
        <h3 className='text-xl'>{EVENT.name}</h3>
        <Skeleton isLoaded={isConnected} className='py-1'>
          <h2 className='mt-2 text-4xl'>{timeRemaining}</h2>
        </Skeleton>
        <h4 className='mt-2 mb-2'>{blockText}</h4>
        <ConnectionStatus />
        <p className='max-w-md mx-auto mt-12 text-sm font-light text-center'>
          {EVENT.desc}
        </p>
      </div>
      {blocksRemaining <= 0 ? <Confetti width={width} height={height} /> : null}
    </section>
  );
}

function ConnectionStatus() {
  const { isConnected, currentHeight } = useSocket();

  return (
    <Chip
      size='sm'
      radius='md'
      variant='dot'
      classNames={{ dot: 'animate-pulse' }}
      color={isConnected ? 'success' : 'warning'}
    >
      {isConnected
        ? 'Live - current height: ' + currentHeight
        : 'Connecting...'}
    </Chip>
  );
}

export default function Index() {
  const [theme, setTheme] = useState('dark');

  return (
    <div className={`${theme} bg-background text-foreground`}>
      <Header setTheme={setTheme} />
      <Countdown />
    </div>
  );
}

function pluralize(num: number, base: string, suffix = 's') {
  return Math.abs(num) != 1 ? base + suffix : base;
}
